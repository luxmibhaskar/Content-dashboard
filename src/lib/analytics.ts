export type ContentMetricsRow = {
  pillar: string | null;
  publish_date: string | null;
  production_status: string;
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
  const totalPublished = rows.filter((r) => r.production_status === "Published").length;

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
