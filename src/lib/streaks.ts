import { localDateKey } from "@/lib/date";

export type StreakRow = { streak_date: string; walked: boolean; posted: boolean };

export function todayDateKey() {
  return localDateKey(new Date());
}

// Walks backward day by day from today, counting while the field is true.
// A missing row or a false value breaks the streak (Section 5.0: "does not
// backfill or forgive gaps automatically").
export function computeStreak(rows: StreakRow[], field: "walked" | "posted"): number {
  const byDate = new Map(rows.map((r) => [r.streak_date, r[field]]));
  let streak = 0;
  const cursor = new Date();

  while (byDate.get(localDateKey(cursor)) === true) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

// Section 6.4: Streak History heatmap. One cell per day, walked/posted
// both true is the darkest cell, one true is mid, neither/missing is
// empty, GitHub-contribution-graph style.
export type HeatmapCell = { date: string; level: 0 | 1 | 2 };

export function computeStreakHeatmap(rows: StreakRow[], weeks = 16): HeatmapCell[] {
  const byDate = new Map(rows.map((r) => [r.streak_date, r]));
  const cells: HeatmapCell[] = [];
  const cursor = new Date();
  cursor.setDate(cursor.getDate() - weeks * 7);
  // Align to the most recent Sunday on/before the start so weeks form
  // clean columns.
  cursor.setDate(cursor.getDate() - cursor.getDay());

  const end = new Date();
  while (cursor <= end) {
    const key = localDateKey(cursor);
    const row = byDate.get(key);
    const level = row ? (row.walked && row.posted ? 2 : row.walked || row.posted ? 1 : 0) : 0;
    cells.push({ date: key, level });
    cursor.setDate(cursor.getDate() + 1);
  }

  return cells;
}
