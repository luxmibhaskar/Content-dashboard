import { localDateKey } from "@/lib/date";

export type CalendarRange = "week" | "month" | "custom";

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

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: localDateKey(start), to: localDateKey(end) };
}
