import { localDateKey } from "@/lib/date";
import type { Brand } from "@/lib/brand";

export type StreakRow = { streak_date: string; walked: boolean; posted: boolean };

// Streak renaming, per brand (2026-08-27): the underlying tracking is
// identical for both brands - same daily_streaks.walked boolean, same
// consecutive-day streak logic (computeStreak below) - only what it
// means, and is called, differs. LBsTransformation keeps its literal
// walking meaning, just relabeled. LBsWorks repurposes the same column
// for a different daily check-in entirely (a walking metric never fit
// that brand's build-in-public identity), so its copy doesn't mention
// walking at all. Never surface the column name "walked" itself in UI
// copy, always go through this map.
export const WALK_STREAK_LABEL: Record<
  Brand,
  {
    name: string;
    short: string;
    // One word, for compact spots (Analytics Overview's "N walk / M post"
    // KPI value) where the full "short" label doesn't fit.
    word: string;
    checkinQuestionToday: string;
    checkinQuestionPast: string;
  }
> = {
  lbstransformation: {
    name: "Walk/Workout Streak",
    // Kept short to reduce wrapping of the top-bar streak row (toggle +
    // all visible items) at desktop widths, see
    // docs/dashboard-redesign.md "Layout follow-ups". `name` keeps the
    // fuller "Walk/Workout" wording for CSV headers and form titles.
    short: "Walk streak",
    word: "walk",
    checkinQuestionToday: "Walked/worked out today?",
    checkinQuestionPast: "Walked/worked out?",
  },
  lbsworks: {
    name: "Work/Innovation Streak",
    short: "Work streak",
    word: "work",
    checkinQuestionToday: "Worked on something innovative today?",
    checkinQuestionPast: "Worked on something innovative?",
  },
};

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
