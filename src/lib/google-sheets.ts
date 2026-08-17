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

async function existingSheets(sheets: sheets_v4.Sheets, spreadsheetId: string) {
  const { data } = await sheets.spreadsheets.get({ spreadsheetId });
  return (data.sheets ?? []).map((s) => ({
    title: s.properties?.title ?? "",
    sheetId: s.properties?.sheetId ?? null,
  }));
}

// Creates any tabs that don't exist yet, deletes Google's auto-created
// "Sheet1" default tab if it's still sitting there (it's always blank
// and, being leftmost, is what a viewer lands on first, easy to mistake
// for the whole backup being empty), then overwrites each tab's content
// entirely (headers + rows) so a re-run always reflects the current
// state, no stale leftover rows from a shorter previous sync.
export async function writeSheetTabs(
  spreadsheetId: string,
  tabs: { title: string; headers: string[]; rows: (string | number | boolean | null)[][] }[],
) {
  const sheets = getSheetsClient();
  const existing = await existingSheets(sheets, spreadsheetId);
  const existingTitles = new Set(existing.map((s) => s.title));

  const missing = tabs.filter((t) => !existingTitles.has(t.title));
  if (missing.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: missing.map((t) => ({ addSheet: { properties: { title: t.title } } })),
      },
    });
  }

  const defaultTab = existing.find((s) => s.title === "Sheet1" && s.sheetId !== null);
  if (defaultTab) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ deleteSheet: { sheetId: defaultTab.sheetId } }],
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
