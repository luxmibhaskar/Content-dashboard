import { localDateKey } from "@/lib/date";

export type CalendarRange = "week" | "month" | "3month" | "6month" | "year" | "custom";

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
