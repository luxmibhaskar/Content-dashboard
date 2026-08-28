import { google, sheets_v4 } from "googleapis";

// A PEM key survives a lot of mis-pasting between .env.local, the Vercel
// dashboard, and a JSON credentials file. Left unhandled, any of these
// reaches Node's crypto as "error:1E08010C:DECODER routines::unsupported"
// with no hint which one it was (this exact error took a production
// backup outage to diagnose). Normalize the common damage instead:
//   - surrounding whitespace / trailing newline from a copy-paste
//   - one pair of wrapping quotes (Vercel keeps them; dotenv strips them)
//   - newlines stored as literal "\n" (and "\r\n"), which real PEM needs
//     as actual newlines, plus stray CRs from Windows clipboards
function normalizePrivateKey(raw: string): string {
  let key = raw.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  return key
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!email || !key) {
    throw new Error("Google service account credentials are not configured.");
  }

  return new google.auth.JWT({
    email,
    key: normalizePrivateKey(key),
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
// for the whole backup being empty), reorders the tabs left-to-right to
// match the order they're passed in (tabs added in later code updates
// otherwise pile up at the end in creation order, drifting from the
// code's list), then overwrites each tab's content entirely (headers +
// rows) so a re-run always reflects the current state, no stale
// leftover rows from a shorter previous sync.
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

  // Re-fetch (picks up ids for just-added tabs and the Sheet1 removal),
  // then, only if the current left-to-right order doesn't already match
  // `tabs`, move each into place. Assigning index i to tab i in order
  // is stable: tabs 0..i-1 are already fixed, so moving tab i to index i
  // drops it right after them.
  const afterCreate = await existingSheets(sheets, spreadsheetId);
  const idByTitle = new Map(afterCreate.map((s) => [s.title, s.sheetId]));
  const currentOrder = afterCreate
    .map((s) => s.title)
    .filter((title) => tabs.some((t) => t.title === title));
  const desiredOrder = tabs.map((t) => t.title);
  if (currentOrder.join("\u0000") !== desiredOrder.join("\u0000")) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: tabs
          .map((t, i) => {
            const sheetId = idByTitle.get(t.title);
            return sheetId == null
              ? null
              : { updateSheetProperties: { properties: { sheetId, index: i }, fields: "index" } };
          })
          .filter((r): r is NonNullable<typeof r> => r !== null),
      },
    });
  }

  // One batchClear + one batchUpdate for all tabs, not a clear+update
  // per tab. The per-tab loop was 2 write requests x 18 tabs = 36 per
  // brand, well into Sheets' 60/min per-user write quota on its own
  // (and it tipped over once the reorder batchUpdate above was added).
  // Batched, the whole write is 2 (or 3 with a reorder) requests per
  // brand. Brands now run in separate invocations a few minutes apart
  // (see runBackupSyncBrands), so the quota is really only ever hit by
  // one brand at a time, but keeping the write batched is still what
  // gives that stagger enough headroom to matter.
  await sheets.spreadsheets.values.batchClear({
    spreadsheetId,
    requestBody: { ranges: tabs.map((t) => `${t.title}!A:ZZ`) },
  });
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: tabs.map((tab) => ({
        range: `${tab.title}!A1`,
        values: [tab.headers, ...tab.rows.map((row) => row.map((cell) => cell ?? ""))],
      })),
    },
  });
}
