export type StreakRow = { streak_date: string; walked: boolean; posted: boolean };

function toDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function todayDateKey() {
  return toDateKey(new Date());
}

// Walks backward day by day from today, counting while the field is true.
// A missing row or a false value breaks the streak (Section 5.0: "does not
// backfill or forgive gaps automatically").
export function computeStreak(rows: StreakRow[], field: "walked" | "posted"): number {
  const byDate = new Map(rows.map((r) => [r.streak_date, r[field]]));
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  while (byDate.get(toDateKey(cursor)) === true) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
