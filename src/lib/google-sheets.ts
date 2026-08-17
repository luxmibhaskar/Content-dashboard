import { google, sheets_v4 } from "googleapis";

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!email || !key) {
    throw new Error("Google service account credentials are not configured.");
  }

  return new google.auth.JWT({
    email,
    // .env files store the key with literal "\n" sequences, not real
    // newlines, PEM parsing needs the real thing.
    key: key.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getSheetsClient(): sheets_v4.Sheets {
  return google.sheets({ version: "v4", auth: getAuth() });
}

async function existingTabTitles(sheets: sheets_v4.Sheets, spreadsheetId: string) {
  const { data } = await sheets.spreadsheets.get({ spreadsheetId });
  return new Set((data.sheets ?? []).map((s) => s.properties?.title).filter(Boolean));
}

// Creates any tabs that don't exist yet, then overwrites each tab's
// content entirely (headers + rows) so a re-run always reflects the
// current state, no stale leftover rows from a shorter previous sync.
export async function writeSheetTabs(
  spreadsheetId: string,
  tabs: { title: string; headers: string[]; rows: (string | number | boolean | null)[][] }[],
) {
  const sheets = getSheetsClient();
  const existing = await existingTabTitles(sheets, spreadsheetId);

  const missing = tabs.filter((t) => !existing.has(t.title));
  if (missing.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: missing.map((t) => ({ addSheet: { properties: { title: t.title } } })),
      },
    });
  }

  for (const tab of tabs) {
    const values = [tab.headers, ...tab.rows.map((row) => row.map((cell) => cell ?? ""))];
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${tab.title}!A:ZZ`,
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tab.title}!A1`,
      valueInputOption: "RAW",
      requestBody: { values },
    });
  }
}
