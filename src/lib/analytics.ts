import type { ContentPlatformPostWithSnapshots } from "@/lib/platform-analytics";
import { currentStatsOf } from "@/lib/platform-analytics";
import type { HookLibraryType } from "@/lib/types";

// docs/platform-performance-tracking.md Migration section: views and
// engagement are pre-aggregated (aggregateByContentId, src/lib/platform-
// analytics.ts, latest snapshot per platform-post, summed across a
// content item's platform-posts) before reaching any function in this
// file, not read from content_calendar directly anymore. conversions is
// the one field left reading the old column, deliberately not migrated:
// the new per-platform tables have no conversions field at all, a real
// design decision (conversions is a business outcome, not a platform
// engagement signal, doesn't obviously belong in a per-platform time-
// series model the same way views/likes/comments/saves/shares do), left
// for Phase G to resolve properly rather than as a side effect here.
//
// Analytics audit (2026-08-27) Phase 1: viewsAgg/engagementAgg are
// nullable now, null meaning "none of this item's platform-posts have
// ever been checked in" (src/lib/platform-analytics.ts), distinct from
// a real, tracked 0. Every function below treats null as "excluded",
// not "zero", the same distinction conversions already modeled.
export type ContentMetricsRow = {
  pillar: string | null;
  publish_date: string | null;
  production_status: string | null;
  viewsAgg: number | null;
  engagementAgg: number | null;
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
  hasPlatformData: boolean;
};

// Section 6.2. Conversions and views/engagement both hide gracefully
// when nothing in range tracks them (hasConversions / hasPlatformData) -
// a genuinely fresh channel with zero views would report a real 0 here,
// not null, so this isn't "no data ever" being mistaken for "0 views",
// it's specifically "no check-in has been logged for anything in range
// yet".
export function computeKpis(rows: ContentMetricsRow[]): AnalyticsKpis {
  const totalPublished = rows.filter((r) => r.production_status === "Published / Scheduled").length;

  let totalViews = 0;
  let totalEngagement = 0;
  let totalConversions = 0;
  let hasConversions = false;
  let hasPlatformData = false;

  for (const r of rows) {
    if (r.viewsAgg !== null) {
      totalViews += r.viewsAgg;
      totalEngagement += r.engagementAgg ?? 0;
      hasPlatformData = true;
    }
    if (r.conversions !== null) {
      hasConversions = true;
      totalConversions += r.conversions;
    }
  }

  const avgEngagementRate = hasPlatformData && totalViews > 0 ? (totalEngagement / totalViews) * 100 : null;
  const avgConversionRate = hasConversions && totalViews > 0 ? (totalConversions / totalViews) * 100 : null;

  return {
    totalPublished,
    totalViews,
    totalEngagement,
    avgEngagementRate,
    totalConversions,
    avgConversionRate,
    hasConversions,
    hasPlatformData,
  };
}

export type OverTimePoint = { date: string; Views: number; Engagement: number };

export function computePerformanceOverTime(rows: ContentMetricsRow[]): OverTimePoint[] {
  const byDate = new Map<string, OverTimePoint>();

  for (const r of rows) {
    if (!r.publish_date) continue;
    const day = r.publish_date.slice(0, 10);
    const entry = byDate.get(day) ?? { date: day, Views: 0, Engagement: 0 };
    // An untracked row contributes nothing known, same as contributing a
    // real 0 to a sum - unlike an average, summing doesn't distort the
    // total either way, so no null-tracking needed here.
    entry.Views += r.viewsAgg ?? 0;
    entry.Engagement += r.engagementAgg ?? 0;
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
    entry.Views += r.viewsAgg ?? 0;
    entry.Engagement += r.engagementAgg ?? 0;
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
    entry.Views += r.viewsAgg ?? 0;
    entry.Engagement += r.engagementAgg ?? 0;
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
  return rows
    .filter((r): r is ExtendedMetricsRow & { viewsAgg: number } => r.viewsAgg !== null && r.viewsAgg > 0)
    .sort((a, b) => b.viewsAgg - a.viewsAgg)
    .slice(0, limit)
    .map((r) => ({
      id: r.id,
      final_title: r.final_title || "Untitled",
      views: r.viewsAgg,
      engagement: r.engagementAgg ?? 0,
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

// Section 6.3: Hook Type Performance. "X: hook_type - not a separately
// maintained field. This pulls from whichever hook_variants row has
// is_live = true for that content item, the hook type of what was
// actually published, not a suggestion." An empty shell since Phase 1
// of this build (the placeholder text this replaces said so honestly);
// hookTypeByContentId comes from hook_variants.hook_type
// (0021_hook_variants_type.sql), stored starting Phase 4 of the
// analytics audit (2026-08-27) - hookType existed at useHook's own call
// site the whole time (hook-actions.ts), just never got saved before
// now, so only hooks "Used" from this point on carry a type.
const HOOK_TYPE_LABELS: Record<HookLibraryType, string> = {
  visual: "Visual",
  text: "Textual",
  verbal: "Verbal",
};

export function computeHookTypePerformance(
  rows: ExtendedMetricsRow[],
  hookTypeByContentId: Map<string, HookLibraryType>,
): NamedMetric[] {
  return groupPerformance(rows, (r) => {
    const hookType = hookTypeByContentId.get(r.id);
    return hookType ? HOOK_TYPE_LABELS[hookType] : null;
  });
}

// 6. Retention Drop Patterns retired here (analytics audit, 2026-08-27,
// Phase 3): it read content_calendar.retention_drop_note/timestamp,
// whose only UI setter was removed in topic-page-redesign.md Section 9.
// Replaced by computeRetentionDropTrends (src/lib/retention-drop.ts),
// sourced from the per-check-in fields on
// content_platform_stats_snapshots. The two content_calendar columns
// were dropped entirely in 0023_drop_content_calendar_retention_drop.sql.

// 8. Idea Source Performance
export function computeIdeaSourcePerformance(rows: ExtendedMetricsRow[]): NamedMetric[] {
  return groupPerformance(rows, (r) => r.idea_source);
}

// 9. Repurposing Performance: originals (no derived_from_content_id) vs
// what's been derived from them. Flags Long Video originals with zero
// derivatives as untapped repurposing opportunities. docs/platform-
// performance-tracking.md Section 8: "stays conceptually the same...
// but should now show real performance comparison using the new per-
// platform data" - same shape as before, viewsAgg is the only thing
// that changed under it.
//
// Analytics audit (2026-08-27) Phase 1: views (the original's own count)
// stays nullable and is left untracked rather than shown as 0 -
// specific-item display of "0 views" reads as "checked in, genuinely
// zero", the exact misleading case this whole phase exists to fix.
// derivativeViews is a sum across possibly several derivatives, treating
// any not-yet-checked-in derivative as contributing nothing known (same
// sum-invariant reasoning as computePerformanceByPillar), not worth its
// own null state.
export type RepurposingRow = {
  id: string;
  final_title: string;
  views: number | null;
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
        views: r.viewsAgg,
        derivativeCount: derivatives.length,
        derivativeViews: derivatives.reduce((sum, d) => sum + (d.viewsAgg ?? 0), 0),
        isUntappedLongForm: derivatives.length === 0 && r.format === "Long Video",
      };
    })
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
}

// 10. docs/platform-performance-tracking.md Section 8: "Best Time to
// Post" renamed "Content Posted Time", sourced from
// content_platform_posts.published_at (real date+time a specific
// platform post actually went out, not publish_date's vague
// approximation), shown separately for Long Form and Short Form since
// they're different posting rhythms. Each platform-post's own current
// views (its latest snapshot, src/lib/platform-analytics.ts) is what
// gets averaged per day-of-week, not the parent item's total across
// every platform - "which day performed best" is inherently a per-post
// question once a single item can have several posts.
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type DayOfWeekPoint = { day: string; "Avg Views": number };

export type ContentPlatformPostWithFormat = ContentPlatformPostWithSnapshots & {
  format: string | null;
};

function bucketByDayOfWeek(posts: ContentPlatformPostWithFormat[]): DayOfWeekPoint[] {
  const buckets = new Map<number, { totalViews: number; count: number }>();
  posts.forEach((p) => {
    const views = currentStatsOf(p).views;
    // Analytics audit (2026-08-27) Phase 1: a post with no check-in
    // logged yet used to count as 0 views in this average, dragging a
    // day's real numbers down toward zero the more un-checked-in volume
    // it had. Excluded from both sum and count now, same fix as
    // Competitors' Avg Views (competitors/page.tsx).
    if (views === null) return;
    const day = new Date(p.published_at).getDay();
    const b = buckets.get(day) ?? { totalViews: 0, count: 0 };
    b.totalViews += views;
    b.count += 1;
    buckets.set(day, b);
  });
  return DAY_NAMES.map((name, i) => {
    const b = buckets.get(i);
    return { day: name, "Avg Views": b && b.count > 0 ? Math.round(b.totalViews / b.count) : 0 };
  });
}

export function computeContentPostedTime(posts: ContentPlatformPostWithFormat[]): {
  longForm: DayOfWeekPoint[];
  shortForm: DayOfWeekPoint[];
} {
  return {
    longForm: bucketByDayOfWeek(posts.filter((p) => p.format === "Long Video")),
    shortForm: bucketByDayOfWeek(posts.filter((p) => p.format === "Short")),
  };
}

// 11. Analytics audit (2026-08-27) Phase 5, recommendation 1: Per-
// Platform Comparison - total views/engagement grouped by platform.
// Genuinely missing before this: every other breakdown on this page
// groups by pillar, sub-topic, idea source, or hook type, never by
// platform itself, despite that being the entire point of this whole
// migration. Grouped at the platform-post level, not per content item
// like groupPerformance's other callers - a single item can span
// several platforms, so "which platform is worth my time" is inherently
// a per-post question, same reasoning as Content Posted Time.
export function computePlatformComparison(posts: ContentPlatformPostWithSnapshots[]): NamedMetric[] {
  const map = new Map<string, NamedMetric>();
  for (const post of posts) {
    const stats = currentStatsOf(post);
    if (stats.views === null) continue;
    const entry = map.get(post.platform) ?? { name: post.platform, Views: 0, Engagement: 0, count: 0 };
    entry.Views += stats.views;
    entry.Engagement += stats.engagement ?? 0;
    entry.count += 1;
    map.set(post.platform, entry);
  }
  return [...map.values()];
}

// 12. Analytics audit (2026-08-27) Phase 5, recommendation 2: Short vs
// Long Format comparison - AVERAGE (not total) views/engagement per
// format, deliberately unlike every other groupPerformance-based chart
// on this page. A sum would just reward whichever format has more
// volume; the actual question here is which format performs better per
// piece, the same reasoning the audit report gave for recommending this
// view in the first place.
const FORMAT_LABELS: Record<string, string> = { Short: "Short", "Long Video": "Long" };

export function computeFormatComparison(rows: ExtendedMetricsRow[]): NamedMetric[] {
  const totals = groupPerformance(rows, (r) => (r.format && r.format in FORMAT_LABELS ? r.format : null));
  return totals.map((t) => ({
    name: FORMAT_LABELS[t.name] ?? t.name,
    Views: t.count > 0 ? Math.round(t.Views / t.count) : 0,
    Engagement: t.count > 0 ? Math.round(t.Engagement / t.count) : 0,
    count: t.count,
  }));
}
