import { addDays, localDateKey, startOfToday } from "@/lib/date";

export type AnalyticsRange = "today" | "7d" | "30d" | "90d" | "year" | "all";

export const ANALYTICS_RANGES: { value: AnalyticsRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "year", label: "This Year" },
  { value: "all", label: "All-time" },
];

export function isAnalyticsRange(value: string | undefined): value is AnalyticsRange {
  return ANALYTICS_RANGES.some((r) => r.value === value);
}

export function computeAnalyticsRange(range: AnalyticsRange): { from: string | null; to: string | null } {
  const now = startOfToday();

  switch (range) {
    case "today":
      return { from: localDateKey(now), to: localDateKey(now) };
    case "7d":
      return { from: localDateKey(addDays(now, -6)), to: localDateKey(now) };
    case "30d":
      return { from: localDateKey(addDays(now, -29)), to: localDateKey(now) };
    case "90d":
      return { from: localDateKey(addDays(now, -89)), to: localDateKey(now) };
    case "year": {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      return { from: localDateKey(start), to: localDateKey(end) };
    }
    case "all":
      return { from: null, to: null };
  }
}
