import { localDateKey, startOfToday, addDays } from "@/lib/date";

export type OutputRow = {
  production_status: string | null;
  publish_date: string | null;
  format: string | null;
};

export type OutputCounts = { last30Days: number; thisMonth: number; thisWeek: number };
export type FormatBreakdown = { long: number; short: number; other: number };

// Same "published" definition already used for Analytics' Total Published
// KPI (src/lib/analytics.ts computeKpis): production_status is the source
// of truth, not a separate boolean. A publish_date in the future with that
// status is a scheduled item, not yet published, so it's excluded here.
function isPublished(row: OutputRow, todayKey: string): row is OutputRow & { publish_date: string } {
  return row.production_status === "Published / Scheduled" && !!row.publish_date && row.publish_date.slice(0, 10) <= todayKey;
}

// Shared with src/lib/audience-growth.ts's Output vs Milestone view, same
// "published" definition as everywhere else here, not a separate rule.
export function publishedDatesOf(rows: OutputRow[]): string[] {
  const todayKey = localDateKey(startOfToday());
  return rows.filter((r) => isPublished(r, todayKey)).map((r) => r.publish_date.slice(0, 10));
}

export function computeOutputCounts(rows: OutputRow[]): OutputCounts {
  const today = startOfToday();
  const todayKey = localDateKey(today);
  const last30Start = localDateKey(addDays(today, -29));
  const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const daysSinceMonday = (today.getDay() + 6) % 7;
  const weekStart = localDateKey(addDays(today, -daysSinceMonday));

  let last30Days = 0;
  let thisMonth = 0;
  let thisWeek = 0;

  for (const row of rows) {
    if (!isPublished(row, todayKey)) continue;
    const date = row.publish_date.slice(0, 10);
    if (date >= last30Start) last30Days += 1;
    if (date >= monthStart) thisMonth += 1;
    if (date >= weekStart) thisWeek += 1;
  }

  return { last30Days, thisMonth, thisWeek };
}

// "Long Video" is the only format that's unambiguously long-form; "Reel"
// and "Short" are unambiguously short-form. Post/Thread/Story/Other
// describe a platform or shape, not a length, forcing them into either
// bucket would misrepresent them, so they land in "other" instead.
const LONG_FORMATS = new Set(["Long Video"]);
const SHORT_FORMATS = new Set(["Reel", "Short"]);

export function computeFormatBreakdown(rows: OutputRow[]): FormatBreakdown {
  const todayKey = localDateKey(startOfToday());
  let long = 0;
  let short = 0;
  let other = 0;

  for (const row of rows) {
    if (!isPublished(row, todayKey)) continue;
    const format = row.format ?? "";
    if (LONG_FORMATS.has(format)) long += 1;
    else if (SHORT_FORMATS.has(format)) short += 1;
    else other += 1;
  }

  return { long, short, other };
}
