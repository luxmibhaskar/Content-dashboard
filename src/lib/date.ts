// Local calendar date, not UTC. See streaks.ts's original bug: converting
// via toISOString() shifts the date by a day for any positive UTC offset
// around local midnight. Every date-key computation in the app should
// route through this single function so nothing can disagree again.
export function localDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

// Monday-start week, matching the week-bucketing already inlined in
// src/lib/content-output.ts's "This Week" count.
export function startOfWeek(d: Date): Date {
  const daysSinceMonday = (d.getDay() + 6) % 7;
  return addDays(d, -daysSinceMonday);
}

// Section 12: Weekly Review runs on Sundays, for the Monday-Sunday week
// that just concluded (today, if today is Sunday).
export function currentReviewWeek(today: Date = startOfToday()): { start: string; end: string } {
  const end = addDays(today, -today.getDay());
  const start = addDays(end, -6);
  return { start: localDateKey(start), end: localDateKey(end) };
}
