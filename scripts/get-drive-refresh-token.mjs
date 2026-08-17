#!/usr/bin/env node
// One-time (or re-run if the token is ever revoked) helper to get a
// Drive-scoped OAuth refresh token for the Google account that owns the
// backup folders. Service accounts have no Drive storage quota of their
// own and can't create new files there (see src/lib/google-drive.ts),
// so Drive auth runs as this account instead, via OAuth.
//
// Usage:
//   node scripts/get-drive-refresh-token.mjs
//     -> prints an authorization URL. Open it, sign in with the Google
//        account that owns the backup folders, grant access. The
//        browser lands on a page that fails to load at
//        http://localhost/?code=..., that's expected, nothing needs to
//        be listening there. Copy the "code" value from the URL bar.
//
//   node scripts/get-drive-refresh-token.mjs <code>
//     -> exchanges that code for a refresh token and prints it. Paste
//        the printed value into .env.local as GOOGLE_OAUTH_REFRESH_TOKEN.

import { google } from "googleapis";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readEnvLocal() {
  const path = join(__dirname, "..", ".env.local");
  const content = readFileSync(path, "utf-8");
  const get = (name) => {
    const match = content.match(new RegExp(`^${name}=(.*)$`, "m"));
    return match ? match[1].trim() : null;
  };
  return {
    clientId: get("GOOGLE_OAUTH_CLIENT_ID"),
    clientSecret: get("GOOGLE_OAUTH_CLIENT_SECRET"),
  };
}

const { clientId, clientSecret } = readEnvLocal();
if (!clientId || !clientSecret) {
  console.error(
    "Missing GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET in .env.local. Create an OAuth Client ID (Desktop app type) in Google Cloud Console first, in the same project as the existing service account.",
  );
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, "http://localhost");

const code = process.argv[2];

if (!code) {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/drive"],
  });
  console.log(
    "Open this URL, sign in with the Google account that owns the backup folders, and grant access:\n",
  );
  console.log(authUrl);
  console.log(
    '\nThe browser will land on a page that fails to load at http://localhost/?code=..., that\'s expected. Copy the "code" value from the URL bar, then run:\n',
  );
  console.log("  node scripts/get-drive-refresh-token.mjs <code>\n");
  process.exit(0);
}

const { tokens } = await oauth2Client.getToken(code);
if (!tokens.refresh_token) {
  console.error(
    "No refresh token came back, this usually means access was already granted before without revoking it first. Revoke access at https://myaccount.google.com/permissions and run step 1 again.",
  );
  process.exit(1);
}

console.log("Refresh token, paste this into .env.local as GOOGLE_OAUTH_REFRESH_TOKEN:\n");
console.log(tokens.refresh_token);
