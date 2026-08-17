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
