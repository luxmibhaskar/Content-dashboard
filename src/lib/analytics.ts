export type ContentMetricsRow = {
  pillar: string | null;
  publish_date: string | null;
  production_status: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  conversions: number | null;
};

export type AnalyticsKpis = {
  totalPublished: number;
  totalViews: number;
  totalEngagement: number;
  avgEngagementRate: number | null;
  totalConversions: number;
  avgConversionRate: number | null;
  hasConversions: boolean;
};

function engagementOf(r: ContentMetricsRow): number {
  return (r.likes ?? 0) + (r.comments ?? 0) + (r.shares ?? 0) + (r.saves ?? 0);
}

// Section 6.2. Conversions hide gracefully when nothing in range tracks
// them; views/engagement always show since a genuinely fresh channel with
// zero views is a normal state, not an "untracked" one.
export function computeKpis(rows: ContentMetricsRow[]): AnalyticsKpis {
  const totalPublished = rows.filter((r) => r.production_status === "Published / Scheduled").length;

  let totalViews = 0;
  let totalEngagement = 0;
  let totalConversions = 0;
  let hasConversions = false;

  for (const r of rows) {
    totalViews += r.views ?? 0;
    totalEngagement += engagementOf(r);
    if (r.conversions !== null) {
      hasConversions = true;
      totalConversions += r.conversions;
    }
  }

  const avgEngagementRate = totalViews > 0 ? (totalEngagement / totalViews) * 100 : null;
  const avgConversionRate = hasConversions && totalViews > 0 ? (totalConversions / totalViews) * 100 : null;

  return {
    totalPublished,
    totalViews,
    totalEngagement,
    avgEngagementRate,
    totalConversions,
    avgConversionRate,
    hasConversions,
  };
}

export type OverTimePoint = { date: string; Views: number; Engagement: number };

export function computePerformanceOverTime(rows: ContentMetricsRow[]): OverTimePoint[] {
  const byDate = new Map<string, OverTimePoint>();

  for (const r of rows) {
    if (!r.publish_date) continue;
    const day = r.publish_date.slice(0, 10);
    const entry = byDate.get(day) ?? { date: day, Views: 0, Engagement: 0 };
    entry.Views += r.views ?? 0;
    entry.Engagement += engagementOf(r);
    byDate.set(day, entry);
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export type PillarPoint = { pillar: string; Views: number; Engagement: number };

export function computePerformanceByPillar(rows: ContentMetricsRow[]): PillarPoint[] {
  const byPillar = new Map<string, PillarPoint>();

  for (const r of rows) {
    const pillar = r.pillar || "Unassigned";
    const entry = byPillar.get(pillar) ?? { pillar, Views: 0, Engagement: 0 };
    entry.Views += r.views ?? 0;
    entry.Engagement += engagementOf(r);
    byPillar.set(pillar, entry);
  }

  return Array.from(byPillar.values());
}

export type PillarBalance = {
  data: { pillar: string; count: number }[];
  overPosting: string | null;
  total: number;
};

// Section 6.3: flag over/under-posting if one pillar is more than 60% of
// posts in the period.
export function computePillarBalance(rows: ContentMetricsRow[]): PillarBalance {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const pillar = r.pillar || "Unassigned";
    counts.set(pillar, (counts.get(pillar) ?? 0) + 1);
  }

  const total = rows.length;
  const data = Array.from(counts.entries()).map(([pillar, count]) => ({ pillar, count }));
  const overPosting = data.find((d) => total > 0 && d.count / total > 0.6);

  return { data, overPosting: overPosting?.pillar ?? null, total };
}

// Section 6.4: Secondary Graphs. Extends ContentMetricsRow with the
// extra columns these need, structurally compatible with every function
// above (they only ever read the base fields).
export type ExtendedMetricsRow = ContentMetricsRow & {
  id: string;
  final_title: string | null;
  sub_topic: string | null;
  format: string | null;
  idea_source: string | null;
  derived_from_content_id: string | null;
  retention_drop_timestamp: string | null;
  retention_drop_note: string | null;
};

export type NamedMetric = { name: string; Views: number; Engagement: number; count: number };

function groupPerformance(
  rows: ExtendedMetricsRow[],
  keyFn: (r: ExtendedMetricsRow) => string | null,
): NamedMetric[] {
  const map = new Map<string, NamedMetric>();
  for (const r of rows) {
    const key = keyFn(r);
    if (!key) continue;
    const entry = map.get(key) ?? { name: key, Views: 0, Engagement: 0, count: 0 };
    entry.Views += r.views ?? 0;
    entry.Engagement += engagementOf(r);
    entry.count += 1;
    map.set(key, entry);
  }
  return [...map.values()];
}

// 1. Top Sub-topics
export function computeTopSubTopics(rows: ExtendedMetricsRow[], limit = 10): NamedMetric[] {
  return groupPerformance(rows, (r) => r.sub_topic)
    .sort((a, b) => b.Views - a.Views)
    .slice(0, limit);
}

// 2. Content Output Volume Over Time, stacked by pillar, bucketed by month.
export type VolumePoint = { period: string; [pillar: string]: string | number };

export function computeOutputVolumeOverTime(rows: ExtendedMetricsRow[]): {
  data: VolumePoint[];
  pillars: string[];
} {
  const pillars = new Set<string>();
  const byPeriod = new Map<string, VolumePoint>();

  for (const r of rows) {
    if (!r.publish_date) continue;
    const period = r.publish_date.slice(0, 7);
    const pillar = r.pillar || "Unassigned";
    pillars.add(pillar);
    const entry = byPeriod.get(period) ?? { period };
    entry[pillar] = ((entry[pillar] as number) ?? 0) + 1;
    byPeriod.set(period, entry);
  }

  return {
    data: [...byPeriod.values()].sort((a, b) => a.period.localeCompare(b.period)),
    pillars: [...pillars],
  };
}

// 3. Funnel: Reach -> Engagement -> Conversion
export function computeFunnel(kpis: AnalyticsKpis): { name: string; value: number }[] {
  const stages = [
    { name: "Reach (Views)", value: kpis.totalViews },
    { name: "Engagement", value: kpis.totalEngagement },
  ];
  if (kpis.hasConversions) {
    stages.push({ name: "Conversion", value: kpis.totalConversions });
  }
  return stages;
}

// 4. Top Performing Content
export type TopContentItem = { id: string; final_title: string; views: number; engagement: number };

export function computeTopPerformingContent(rows: ExtendedMetricsRow[], limit = 10): TopContentItem[] {
  return [...rows]
    .filter((r) => (r.views ?? 0) > 0)
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    .slice(0, limit)
    .map((r) => ({
      id: r.id,
      final_title: r.final_title || "Untitled",
      views: r.views ?? 0,
      engagement: engagementOf(r),
    }));
}

// 5. Research-based vs Custom Performance. sourceByContentId comes from
// whichever title_variant is_live on each item (Section 10.1.3).
export function computeResearchVsCustomPerformance(
  rows: ExtendedMetricsRow[],
  sourceByContentId: Map<string, string>,
): NamedMetric[] {
  return groupPerformance(rows, (r) => sourceByContentId.get(r.id) ?? null);
}

// 6. Retention Drop Patterns, a list, not a chart.
export type RetentionDropRow = {
  id: string;
  final_title: string;
  retention_drop_timestamp: string | null;
  retention_drop_note: string;
};

export function computeRetentionDropPatterns(rows: ExtendedMetricsRow[]): RetentionDropRow[] {
  return rows
    .filter((r): r is ExtendedMetricsRow & { retention_drop_note: string } => Boolean(r.retention_drop_note))
    .map((r) => ({
      id: r.id,
      final_title: r.final_title || "Untitled",
      retention_drop_timestamp: r.retention_drop_timestamp,
      retention_drop_note: r.retention_drop_note,
    }));
}

// 8. Idea Source Performance
export function computeIdeaSourcePerformance(rows: ExtendedMetricsRow[]): NamedMetric[] {
  return groupPerformance(rows, (r) => r.idea_source);
}

// 9. Repurposing Performance: originals (no derived_from_content_id) vs
// what's been derived from them. Flags Long Video originals with zero
// derivatives as untapped repurposing opportunities.
export type RepurposingRow = {
  id: string;
  final_title: string;
  views: number;
  derivativeCount: number;
  derivativeViews: number;
  isUntappedLongForm: boolean;
};

export function computeRepurposingPerformance(rows: ExtendedMetricsRow[]): RepurposingRow[] {
  const derivativesBySource = new Map<string, ExtendedMetricsRow[]>();
  for (const r of rows) {
    if (!r.derived_from_content_id) continue;
    const list = derivativesBySource.get(r.derived_from_content_id) ?? [];
    list.push(r);
    derivativesBySource.set(r.derived_from_content_id, list);
  }

  return rows
    .filter((r) => !r.derived_from_content_id)
    .map((r) => {
      const derivatives = derivativesBySource.get(r.id) ?? [];
      return {
        id: r.id,
        final_title: r.final_title || "Untitled",
        views: r.views ?? 0,
        derivativeCount: derivatives.length,
        derivativeViews: derivatives.reduce((sum, d) => sum + (d.views ?? 0), 0),
        isUntappedLongForm: derivatives.length === 0 && r.format === "Long Video",
      };
    })
    .sort((a, b) => b.views - a.views);
}

// 10. Best Time to Post, by day of week (publish_date already carries
// full date+time, Section 10.1.6).
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type DayOfWeekPoint = { day: string; "Avg Views": number };

export function computeBestTimeToPost(rows: ExtendedMetricsRow[]): DayOfWeekPoint[] {
  const buckets = new Map<number, { totalViews: number; count: number }>();
  for (const r of rows) {
    if (!r.publish_date) continue;
    const day = new Date(r.publish_date).getDay();
    const b = buckets.get(day) ?? { totalViews: 0, count: 0 };
    b.totalViews += r.views ?? 0;
    b.count += 1;
    buckets.set(day, b);
  }
  return DAY_NAMES.map((name, i) => {
    const b = buckets.get(i);
    return { day: name, "Avg Views": b && b.count > 0 ? Math.round(b.totalViews / b.count) : 0 };
  });
}
