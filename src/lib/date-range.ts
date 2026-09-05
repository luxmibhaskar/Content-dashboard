import { localDateKey } from "@/lib/date";

export type CalendarRange = "week" | "month" | "3month" | "6month" | "year" | "custom";

export const CALENDAR_RANGES: CalendarRange[] = ["week", "month", "3month", "6month", "year", "custom"];
export const DEFAULT_CALENDAR_RANGE: CalendarRange = "month";

export function isCalendarRange(value: string | null | undefined): value is CalendarRange {
  return !!value && (CALENDAR_RANGES as string[]).includes(value);
}

// Persisted range filter (2026-09-05): so leaving /calendar and coming
// back (top nav, a quick-access card, "Back to Calendar" on a topic
// page - all plain hrefs to bare /calendar) keeps whatever range was
// last chosen instead of resetting to DEFAULT_CALENDAR_RANGE. Set by
// /api/calendar-range (a route handler, not a Server Action, since
// cookies can only be written from a Server Action or Route Handler,
// never from calendar/page.tsx's own Server Component render) and read
// as a fallback in calendar/page.tsx only when the URL itself has no
// ?range=, so a bookmarked or shared link with an explicit range always
// wins over whatever was last persisted.
export const CALENDAR_RANGE_COOKIE = "calendar_range";
export const CALENDAR_RANGE_FROM_COOKIE = "calendar_range_from";
export const CALENDAR_RANGE_TO_COOKIE = "calendar_range_to";

// Months-back for the trailing-window ranges (3month/6month/year): these
// end today rather than snapping to a calendar boundary the way week
// (Monday-Sunday) and month (1st-last day) do, since "3 months of
// history" is more useful here than "the last 3 calendar months".
const TRAILING_MONTHS_BACK: Record<"3month" | "6month" | "year", number> = {
  "3month": 3,
  "6month": 6,
  year: 12,
};

export function computeRange(range: CalendarRange, from?: string, to?: string) {
  if (range === "custom" && from && to) {
    return { from, to };
  }

  const now = new Date();

  if (range === "week") {
    const day = now.getDay();
    const diffToMonday = (day + 6) % 7;
    const start = new Date(now);
    start.setDate(now.getDate() - diffToMonday);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { from: localDateKey(start), to: localDateKey(end) };
  }

  if (range === "3month" || range === "6month" || range === "year") {
    const start = new Date(now);
    start.setMonth(start.getMonth() - TRAILING_MONTHS_BACK[range]);
    return { from: localDateKey(start), to: localDateKey(now) };
  }

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: localDateKey(start), to: localDateKey(end) };
}
