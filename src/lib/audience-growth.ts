import { localDateKey, startOfWeek } from "@/lib/date";

export type PlatformSnapshotRow = {
  platform: string;
  follower_count: number;
  snapshot_date: string;
};

const AUDIENCE_KEY = "Total Audience";

export type AudienceGrowthPoint = { date: string; [AUDIENCE_KEY]: number };

// Command Center redesign, Redesign Phase 3, Graph 1: total across every
// logged platform, over time. Manual entry means not every platform gets
// updated on the same day, so each platform's count is carried forward
// from its own last known snapshot rather than treated as 0 between
// entries, only including platforms that have at least one snapshot so
// far (a newly-added platform's history genuinely starts where it
// starts, not at a fabricated zero).
export function computeAudienceGrowth(rows: PlatformSnapshotRow[]): AudienceGrowthPoint[] {
  const byDate = new Map<string, PlatformSnapshotRow[]>();
  for (const row of rows) {
    const list = byDate.get(row.snapshot_date) ?? [];
    list.push(row);
    byDate.set(row.snapshot_date, list);
  }

  const current = new Map<string, number>();
  const points: AudienceGrowthPoint[] = [];
  for (const date of [...byDate.keys()].sort()) {
    for (const row of byDate.get(date)!) {
      current.set(row.platform, row.follower_count);
    }
    const total = [...current.values()].reduce((sum, n) => sum + n, 0);
    points.push({ date, [AUDIENCE_KEY]: total });
  }
  return points;
}

export type AudienceDistributionPoint = { platform: string; count: number };

// Graph 2, "Audience Distribution" view: each platform's most recent
// snapshot, whatever date that happens to be for that platform.
export function computeAudienceDistribution(rows: PlatformSnapshotRow[]): AudienceDistributionPoint[] {
  const latest = new Map<string, PlatformSnapshotRow>();
  for (const row of rows) {
    const existing = latest.get(row.platform);
    if (!existing || row.snapshot_date > existing.snapshot_date) latest.set(row.platform, row);
  }
  return [...latest.values()]
    .filter((r) => r.follower_count > 0)
    .map((r) => ({ platform: r.platform, count: r.follower_count }));
}

export type GrowthVelocityPoint = { week: string; "Net Change": number };

// Graph 2, "Growth Velocity" view: week-over-week change in the running
// total from computeAudienceGrowth, bucketed to the same Monday-start
// week used elsewhere in the app. This is a delta between weeks that
// actually have a known total, not a count of snapshots taken, a
// two-week gap with no entries still produces one (larger) delta rather
// than a run of misleading zeros.
export function computeGrowthVelocity(growth: AudienceGrowthPoint[]): GrowthVelocityPoint[] {
  const lastTotalByWeek = new Map<string, number>();
  for (const point of growth) {
    const week = localDateKey(startOfWeek(new Date(`${point.date}T00:00:00`)));
    lastTotalByWeek.set(week, point[AUDIENCE_KEY]);
  }

  const weeks = [...lastTotalByWeek.keys()].sort();
  const result: GrowthVelocityPoint[] = [];
  for (let i = 1; i < weeks.length; i++) {
    const prev = lastTotalByWeek.get(weeks[i - 1])!;
    const curr = lastTotalByWeek.get(weeks[i])!;
    result.push({ week: weeks[i], "Net Change": curr - prev });
  }
  return result;
}

export type OutputVsMilestonePoint = {
  week: string;
  "Content Published": number;
  [AUDIENCE_KEY]: number | null;
};

// Graph 2, "Output vs Milestone" view: content output volume against
// audience growth, same Monday-start weekly buckets as Growth Velocity.
// A week with no audience snapshot gets null (not a carried-forward or
// interpolated number), so the line genuinely gaps there instead of
// implying a data point that was never entered.
export function computeOutputVsMilestone(
  growth: AudienceGrowthPoint[],
  publishedDates: string[],
): OutputVsMilestonePoint[] {
  const audienceByWeek = new Map<string, number>();
  for (const point of growth) {
    const week = localDateKey(startOfWeek(new Date(`${point.date}T00:00:00`)));
    audienceByWeek.set(week, point[AUDIENCE_KEY]);
  }

  const outputByWeek = new Map<string, number>();
  for (const date of publishedDates) {
    const week = localDateKey(startOfWeek(new Date(`${date}T00:00:00`)));
    outputByWeek.set(week, (outputByWeek.get(week) ?? 0) + 1);
  }

  const weeks = new Set([...audienceByWeek.keys(), ...outputByWeek.keys()]);
  return [...weeks]
    .sort()
    .map((week) => ({
      week,
      "Content Published": outputByWeek.get(week) ?? 0,
      [AUDIENCE_KEY]: audienceByWeek.get(week) ?? null,
    }));
}
