export type StreakRow = { streak_date: string; walked: boolean; posted: boolean };

// Local calendar date, not UTC. toISOString() converts to UTC first, which
// shifts the date by a day for any positive UTC offset around local
// midnight, if streak_date is saved via one date function and compared
// via another that disagrees on "today," a just-logged day silently
// fails to match and the streak reads as 0.
function toDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

  while (byDate.get(toDateKey(cursor)) === true) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
