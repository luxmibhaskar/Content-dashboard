import { google, drive_v3 } from "googleapis";
import { Readable } from "stream";

// Drive, unlike Sheets, needs to be authenticated as a real Google
// account rather than the service account: service accounts have no
// storage quota of their own, so they can edit a file a human already
// created and shared with them (how Sheets works), but can't create new
// files or folders, which the archive needs continuously as topics
// accumulate ("Service Accounts do not have storage quota" is Drive
// API's own error for this). OAuth with a refresh token tied to the
// actual Drive owner is the standard fix on a personal (non-Workspace)
// account, see scripts/get-drive-refresh-token.mjs for the one-time
// setup that produces GOOGLE_OAUTH_REFRESH_TOKEN.
function getAuth() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Google OAuth credentials for Drive are not configured (GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET / GOOGLE_OAUTH_REFRESH_TOKEN).",
    );
  }

  const client = new google.auth.OAuth2(clientId, clientSecret);
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

export function getDriveClient(): drive_v3.Drive {
  return google.drive({ version: "v3", auth: getAuth() });
}

// A single folder's contents by name, so the archive sync can answer
// "does <name> exist, and what's its id / link" without a files.list
// round-trip per file. Built once per folder at the top of a sync and
// then threaded through the upsert / sweep helpers below. Drive puts no
// uniqueness constraint on name-within-parent; if duplicates somehow
// exist we keep the first seen (same "files[0] wins" rule the old
// per-file lookups used).
export type DriveFileEntry = { id: string; webViewLink: string };
export type FolderIndex = Map<string, DriveFileEntry>;

export async function indexFolder(
  drive: drive_v3.Drive,
  parentId: string,
): Promise<FolderIndex> {
  const index: FolderIndex = new Map();
  let pageToken: string | undefined;
  do {
    const { data } = await drive.files.list({
      q: `'${parentId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, webViewLink)",
      spaces: "drive",
      pageSize: 1000,
      pageToken,
    });
    for (const f of data.files ?? []) {
      if (f.id && f.name && !index.has(f.name)) {
        index.set(f.name, { id: f.id, webViewLink: f.webViewLink ?? "" });
      }
    }
    pageToken = data.nextPageToken ?? undefined;
  } while (pageToken);
  return index;
}

// Drive has no real folder hierarchy, "path" is just a parent-id chain,
// so every write needs an id lookup first. Reused across the archive
// sync for content-calendar/, research-snapshots/[topic]/, journey-log/.
// Pass `index` (the parent's FolderIndex) to skip the lookup round-trip;
// a folder created here is added back into it.
export async function findOrCreateFolder(
  drive: drive_v3.Drive,
  parentId: string,
  name: string,
  index?: FolderIndex,
): Promise<string> {
  const cached = index?.get(name)?.id;
  if (cached) return cached;

  const escaped = name.replace(/'/g, "\\'");
  const { data } = await drive.files.list({
    q: `'${parentId}' in parents and name = '${escaped}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id, name)",
    spaces: "drive",
  });

  const existing = data.files?.[0]?.id;
  if (existing) {
    index?.set(name, { id: existing, webViewLink: "" });
    return existing;
  }

  const { data: created } = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
  });

  if (!created.id) throw new Error(`Failed to create Drive folder "${name}".`);
  index?.set(name, { id: created.id, webViewLink: "" });
  return created.id;
}

// Section 17.4 hygiene: the archive only ever upserts, so a content
// item deleted from Supabase, or a research topic that was renamed or
// had all its snapshots removed, leaves its Drive files/folders behind
// forever. After a folder's current contents have been written, this
// trashes (reversible, not a hard delete) anything directly inside it
// whose name isn't in `expectedNames`. Callers pass the full set of
// names they just wrote to that folder.
//
// Pass `index` to reuse the folder listing already fetched for this sync
// instead of a fresh files.list. The upsert helpers add every file they
// create back into that same index, so by the time this runs it holds
// pre-existing files plus everything written this run; anything in it
// whose name isn't in `expectedNames` is genuinely orphaned. A name in
// `expectedNames` is never trashed, so a real row that was just written
// can't be swept even if the index is momentarily stale.
export async function trashOrphans(
  drive: drive_v3.Drive,
  parentId: string,
  expectedNames: Set<string>,
  index?: FolderIndex,
): Promise<string[]> {
  let entries: { id: string; name: string }[];
  if (index) {
    entries = [...index].map(([name, entry]) => ({ id: entry.id, name }));
  } else {
    const { data } = await drive.files.list({
      q: `'${parentId}' in parents and trashed = false`,
      fields: "files(id, name)",
      spaces: "drive",
      pageSize: 1000,
    });
    entries = (data.files ?? []).flatMap((f) =>
      f.id && f.name ? [{ id: f.id, name: f.name }] : [],
    );
  }

  const trashed: string[] = [];
  for (const f of entries) {
    if (expectedNames.has(f.name)) continue;
    await drive.files.update({ fileId: f.id, requestBody: { trashed: true } });
    trashed.push(f.name);
  }
  return trashed;
}

// Resolve an existing file id for `name` in `parentId`: from `index` if
// one was passed (no round-trip), otherwise a scoped files.list.
async function existingFileId(
  drive: drive_v3.Drive,
  parentId: string,
  name: string,
  index?: FolderIndex,
): Promise<string | undefined> {
  if (index) return index.get(name)?.id;
  const escaped = name.replace(/'/g, "\\'");
  const { data } = await drive.files.list({
    q: `'${parentId}' in parents and name = '${escaped}' and trashed = false`,
    fields: "files(id, name)",
    spaces: "drive",
  });
  return data.files?.[0]?.id ?? undefined;
}

// Overwrites in place if a file with this name already exists in the
// folder (nightly sync should always reflect current state, not pile up
// duplicates), otherwise creates it. Returns the file's id and a link a
// human can open directly, used as the Sheets "Full Detail Link" column.
// Pass `index` to skip the existence lookup; the written file is added
// back into it so a later trashOrphans call over the same index treats
// it as expected.
export async function upsertMarkdownFile(
  drive: drive_v3.Drive,
  parentId: string,
  name: string,
  content: string,
  index?: FolderIndex,
): Promise<{ id: string; webViewLink: string }> {
  const media = { mimeType: "text/markdown", body: Readable.from([content]) };
  const existing = await existingFileId(drive, parentId, name, index);

  let entry: DriveFileEntry;
  if (existing) {
    const { data: updated } = await drive.files.update({
      fileId: existing,
      media,
      fields: "id, webViewLink",
    });
    entry = { id: updated.id!, webViewLink: updated.webViewLink ?? "" };
  } else {
    const { data: created } = await drive.files.create({
      requestBody: { name, parents: [parentId], mimeType: "text/markdown" },
      media,
      fields: "id, webViewLink",
    });
    entry = { id: created.id!, webViewLink: created.webViewLink ?? "" };
  }
  index?.set(name, entry);
  return entry;
}

// Machine-readable companion to the human-readable .md files, one per
// content item and one per research snapshot (Section 17.4's retrieve
// path reads these back, re-parsing our own prose Markdown would be
// fragile and risks silently losing data on restore).
export async function upsertJsonFile(
  drive: drive_v3.Drive,
  parentId: string,
  name: string,
  data: unknown,
  index?: FolderIndex,
): Promise<{ id: string }> {
  const media = { mimeType: "application/json", body: Readable.from([JSON.stringify(data)]) };
  const existing = await existingFileId(drive, parentId, name, index);

  let id: string;
  if (existing) {
    const { data: updated } = await drive.files.update({ fileId: existing, media, fields: "id" });
    id = updated.id!;
  } else {
    const { data: created } = await drive.files.create({
      requestBody: { name, parents: [parentId], mimeType: "application/json" },
      media,
      fields: "id",
    });
    id = created.id!;
  }
  // Preserve any webViewLink already indexed for this name (JSON
  // companions aren't linked from Sheets, so we don't fetch one here).
  index?.set(name, { id, webViewLink: index.get(name)?.webViewLink ?? "" });
  return { id };
}

// Section 17.4 retrieve path: find a companion file by name within a
// folder and read its content back. Returns null if it's missing
// (nothing to retrieve, not an error worth throwing over).
export async function readTextFile(
  drive: drive_v3.Drive,
  parentId: string,
  name: string,
): Promise<string | null> {
  const escaped = name.replace(/'/g, "\\'");
  const { data } = await drive.files.list({
    q: `'${parentId}' in parents and name = '${escaped}' and trashed = false`,
    fields: "files(id, name)",
    spaces: "drive",
  });

  const fileId = data.files?.[0]?.id;
  if (!fileId) return null;

  const { data: content } = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "text" },
  );
  return content as string;
}

// Same lookup rules as findOrCreateFolder, but returns null instead of
// creating one, used on the retrieve path where a missing folder just
// means "nothing was ever archived here."
export async function findFolder(
  drive: drive_v3.Drive,
  parentId: string,
  name: string,
): Promise<string | null> {
  const escaped = name.replace(/'/g, "\\'");
  const { data } = await drive.files.list({
    q: `'${parentId}' in parents and name = '${escaped}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id, name)",
    spaces: "drive",
  });
  return data.files?.[0]?.id ?? null;
}
