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

// Drive has no real folder hierarchy, "path" is just a parent-id chain,
// so every write needs an id lookup first. Reused across the archive
// sync for content-calendar/, research-snapshots/[topic]/, journey-log/.
export async function findOrCreateFolder(
  drive: drive_v3.Drive,
  parentId: string,
  name: string,
): Promise<string> {
  const escaped = name.replace(/'/g, "\\'");
  const { data } = await drive.files.list({
    q: `'${parentId}' in parents and name = '${escaped}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id, name)",
    spaces: "drive",
  });

  const existing = data.files?.[0]?.id;
  if (existing) return existing;

  const { data: created } = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
  });

  if (!created.id) throw new Error(`Failed to create Drive folder "${name}".`);
  return created.id;
}

// Section 17.4 hygiene: the archive only ever upserts, so a content
// item deleted from Supabase, or a research topic that was renamed or
// had all its snapshots removed, leaves its Drive files/folders behind
// forever. After a folder's current contents have been written, this
// trashes (reversible, not a hard delete) anything directly inside it
// whose name isn't in `expectedNames`. Callers pass the full set of
// names they just wrote to that folder.
export async function trashOrphans(
  drive: drive_v3.Drive,
  parentId: string,
  expectedNames: Set<string>,
): Promise<string[]> {
  const { data } = await drive.files.list({
    q: `'${parentId}' in parents and trashed = false`,
    fields: "files(id, name)",
    spaces: "drive",
    pageSize: 1000,
  });

  const trashed: string[] = [];
  for (const f of data.files ?? []) {
    if (!f.id || !f.name || expectedNames.has(f.name)) continue;
    await drive.files.update({ fileId: f.id, requestBody: { trashed: true } });
    trashed.push(f.name);
  }
  return trashed;
}

// Overwrites in place if a file with this name already exists in the
// folder (nightly sync should always reflect current state, not pile up
// duplicates), otherwise creates it. Returns the file's id and a link a
// human can open directly, used as the Sheets "Full Detail Link" column.
export async function upsertMarkdownFile(
  drive: drive_v3.Drive,
  parentId: string,
  name: string,
  content: string,
): Promise<{ id: string; webViewLink: string }> {
  const escaped = name.replace(/'/g, "\\'");
  const { data } = await drive.files.list({
    q: `'${parentId}' in parents and name = '${escaped}' and trashed = false`,
    fields: "files(id, name)",
    spaces: "drive",
  });

  const media = { mimeType: "text/markdown", body: Readable.from([content]) };
  const existing = data.files?.[0]?.id;

  if (existing) {
    const { data: updated } = await drive.files.update({
      fileId: existing,
      media,
      fields: "id, webViewLink",
    });
    return { id: updated.id!, webViewLink: updated.webViewLink ?? "" };
  }

  const { data: created } = await drive.files.create({
    requestBody: { name, parents: [parentId], mimeType: "text/markdown" },
    media,
    fields: "id, webViewLink",
  });
  return { id: created.id!, webViewLink: created.webViewLink ?? "" };
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
): Promise<{ id: string }> {
  const escaped = name.replace(/'/g, "\\'");
  const { data: existingFiles } = await drive.files.list({
    q: `'${parentId}' in parents and name = '${escaped}' and trashed = false`,
    fields: "files(id, name)",
    spaces: "drive",
  });

  const media = { mimeType: "application/json", body: Readable.from([JSON.stringify(data)]) };
  const existing = existingFiles.files?.[0]?.id;

  if (existing) {
    const { data: updated } = await drive.files.update({ fileId: existing, media, fields: "id" });
    return { id: updated.id! };
  }

  const { data: created } = await drive.files.create({
    requestBody: { name, parents: [parentId], mimeType: "application/json" },
    media,
    fields: "id",
  });
  return { id: created.id! };
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
