import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";
import { localDateKey } from "@/lib/date";
import {
  ANALYTICS_RANGES,
  computeAnalyticsRange,
  isAnalyticsRange,
  type AnalyticsRange,
} from "@/lib/analytics-range";
import {
  computeKpis,
  computePerformanceByPillar,
  computePerformanceOverTime,
  computePillarBalance,
  computeTopSubTopics,
  computeOutputVolumeOverTime,
  computeFunnel,
  computeTopPerformingContent,
  computeResearchVsCustomPerformance,
  computeIdeaSourcePerformance,
  computeRepurposingPerformance,
  computeContentPostedTime,
  type ContentMetricsRow,
  type ExtendedMetricsRow,
  type ContentPlatformPostWithFormat,
} from "@/lib/analytics";
import { aggregateByContentId } from "@/lib/platform-analytics";
import { computeRetentionDropTrends, formatSecondsAsTimestamp, type RetentionDropPost } from "@/lib/retention-drop";
import { computeStreak, computeStreakHeatmap, type StreakRow } from "@/lib/streaks";
import { KpiCard } from "@/components/kpi-card";
import { CollapsibleSection } from "@/components/collapsible-section";
import { GlowCard } from "@/components/glow-card";
import { PerformanceOverTimeChart } from "@/components/charts/performance-over-time-chart";
import { PerformanceByPillarChart } from "@/components/charts/performance-by-pillar-chart";
import { PillarBalanceChart } from "@/components/charts/pillar-balance-chart";
import { NamedMetricBarChart } from "@/components/charts/named-metric-bar-chart";
import { OutputVolumeChart } from "@/components/charts/output-volume-chart";
import { ReachFunnelChart } from "@/components/charts/reach-funnel-chart";
import { TopPerformingList } from "@/components/charts/top-performing-list";
import { ContentPostedTimeChart } from "@/components/charts/content-posted-time-chart";
import { StreakHeatmap } from "@/components/charts/streak-heatmap";
import { cn } from "@/lib/utils";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const range: AnalyticsRange = isAnalyticsRange(params.range) ? params.range : "30d";
  const { from, to } = computeAnalyticsRange(range);

  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  const supabase = await createClient();

  let contentQuery = supabase
    .from("content_calendar")
    .select(
      "id, final_title, pillar, sub_topic, format, publish_date, production_status, idea_source, derived_from_content_id, conversions",
    )
    .eq("brand", brand)
    .eq("is_archived", false);

  if (from && to) {
    contentQuery = contentQuery.gte("publish_date", from).lte("publish_date", `${to}T23:59:59`);
  }

  const streakSince = new Date();
  streakSince.setDate(streakSince.getDate() - 16 * 7);

  const [{ data: contentRows }, { data: streakRows }, { data: liveTitleRows }, { data: platformPostRows }] =
    await Promise.all([
      contentQuery,
      supabase
        .from("daily_streaks")
        .select("streak_date, walked, posted")
        .eq("brand", brand)
        .gte("streak_date", localDateKey(streakSince)),
      supabase.from("title_variants").select("content_id, source").eq("brand", brand).eq("is_live", true),
      // docs/platform-performance-tracking.md Migration section: the
      // views/engagement source for every KPI and graph below, replacing
      // content_calendar.views/likes/comments/shares/saves. Fetched
      // brand-wide, not date-filtered here - an item's total is its
      // platform-posts' current stats regardless of when each post
      // happened, only which content items are in scope (contentQuery's
      // own publish_date filter) narrows the range. Content Posted Time
      // filters this same list by published_at itself, separately, below.
      //
      // Analytics audit (2026-08-27) Phase 2: content_calendar!inner +
      // is_archived filtered here directly now. Every other section on
      // this page is already archived-safe indirectly (contentRows'
      // own is_archived filter means archived items never appear in the
      // lookups built from it), but Content Posted Time reads this raw
      // list straight through by published_at, with no such indirection
      // - archiving a content item doesn't touch its content_platform_posts
      // rows (archive-lifecycle.ts), so without this join an archived
      // item's posts kept counting toward day-of-week averages while
      // being correctly invisible everywhere else on the page.
      // platform and content_calendar's final_title are new selections
      // (analytics audit, 2026-08-27, Phase 3) - platform wasn't fetched
      // at all before despite ContentPlatformPostWithSnapshots' own type
      // requiring it (harmless until now, nothing here read .platform),
      // needed now to label Retention Drop Trends by platform;
      // final_title needed to link each trend row back to its item.
      supabase
        .from("content_platform_posts")
        .select(
          "content_id, platform, published_at, content_platform_stats_snapshots(snapshot_date, views, likes, comments, saves, shares, reposts, retention_drop_timestamp, retention_drop_note), content_calendar!inner(format, is_archived, final_title)",
        )
        .eq("brand", brand)
        .eq("content_calendar.is_archived", false),
    ]);

  // Described locally rather than extending ContentPlatformPostWithSnapshots
  // (src/lib/platform-analytics.ts): that shared type's snapshot shape
  // doesn't carry the two retention fields, and every other consumer of
  // it (competitors/page.tsx, layout.tsx, backup.ts) doesn't select
  // them, so it stays as-is rather than growing fields only this page
  // needs.
  type PlatformPostRow = {
    content_id: string;
    platform: string;
    published_at: string;
    content_platform_stats_snapshots: {
      snapshot_date: string;
      views: number | null;
      likes: number | null;
      comments: number | null;
      saves: number | null;
      shares: number | null;
      reposts: number | null;
      retention_drop_timestamp: string | null;
      retention_drop_note: string | null;
    }[];
    content_calendar:
      | { format: string | null; final_title: string | null }
      | { format: string | null; final_title: string | null }[]
      | null;
  };
  const platformPosts = (platformPostRows ?? []) as unknown as PlatformPostRow[];
  const statsByContentId = aggregateByContentId(platformPosts);

  // Analytics audit (2026-08-27) Phase 1: an item absent from
  // statsByContentId has zero platform-posts at all, same "nothing
  // tracked yet" state as one whose posts exist but have no check-ins -
  // both correctly default to null here now, not 0.
  const NO_STATS = { views: null, engagement: null };
  const rows: ContentMetricsRow[] = (contentRows ?? []).map((r) => {
    const stats = statsByContentId.get(r.id) ?? NO_STATS;
    return {
      pillar: r.pillar,
      publish_date: r.publish_date,
      production_status: r.production_status,
      viewsAgg: stats.views,
      engagementAgg: stats.engagement,
      conversions: r.conversions,
    };
  });
  const extendedRows: ExtendedMetricsRow[] = (contentRows ?? []).map((r) => {
    const stats = statsByContentId.get(r.id) ?? NO_STATS;
    return { ...r, viewsAgg: stats.views, engagementAgg: stats.engagement };
  });
  const kpis = computeKpis(rows);
  const overTime = computePerformanceOverTime(rows);
  const byPillar = computePerformanceByPillar(rows);
  const balance = computePillarBalance(rows);

  const streaks = (streakRows ?? []) as StreakRow[];
  const walkStreak = computeStreak(streaks, "walked");
  const postStreak = computeStreak(streaks, "posted");
  const streakHeatmap = computeStreakHeatmap(streaks);

  const topSubTopics = computeTopSubTopics(extendedRows);
  const outputVolume = computeOutputVolumeOverTime(extendedRows);
  const funnel = computeFunnel(kpis);
  const topPerforming = computeTopPerformingContent(extendedRows);
  const liveTitleSourceById = new Map((liveTitleRows ?? []).map((r) => [r.content_id, r.source]));
  const researchVsCustom = computeResearchVsCustomPerformance(extendedRows, liveTitleSourceById);
  const ideaSourcePerformance = computeIdeaSourcePerformance(extendedRows);
  const repurposing = computeRepurposingPerformance(extendedRows);

  // Section 8: Content Posted Time is the one graph here scoped by each
  // platform-post's own published_at rather than by which content items
  // are in range, so it gets its own date filter on the same brand-wide
  // platformPosts list instead of reusing statsByContentId's item scope.
  const postsInRange =
    from && to
      ? platformPosts.filter((p) => {
          const day = p.published_at.slice(0, 10);
          return day >= from && day <= to;
        })
      : platformPosts;
  const postsWithFormat: ContentPlatformPostWithFormat[] = postsInRange.map((p) => ({
    ...p,
    format: Array.isArray(p.content_calendar) ? (p.content_calendar[0]?.format ?? null) : (p.content_calendar?.format ?? null),
  }));
  const contentPostedTime = computeContentPostedTime(postsWithFormat);

  // Analytics audit (2026-08-27) Phase 3: full history, not scoped to
  // the range filter, same reasoning as the KPIs above - a trend across
  // check-ins is inherently about everything logged so far, not just
  // what happened to publish in the selected window. Only archived-
  // excluded (already true of platformPosts itself, Phase 2's fix).
  const retentionDropPosts: RetentionDropPost[] = platformPosts.map((p) => ({
    content_id: p.content_id,
    final_title: Array.isArray(p.content_calendar)
      ? (p.content_calendar[0]?.final_title ?? null)
      : (p.content_calendar?.final_title ?? null),
    platform: p.platform,
    content_platform_stats_snapshots: p.content_platform_stats_snapshots,
  }));
  const retentionDropTrends = computeRetentionDropTrends(retentionDropPosts);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold">Analytics Overview</h1>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {ANALYTICS_RANGES.map((r) => (
          <Link
            key={r.value}
            href={`/analytics?range=${r.value}`}
            className={cn(
              "rounded-md px-2.5 py-1 text-sm",
              range === r.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {r.label}
          </Link>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCard label="Total Published" value={kpis.totalPublished.toLocaleString()} />
        {/* Analytics audit (2026-08-27) Phase 1: hides the same way the
            Conversions KPIs already do below when nothing in range has
            ever been checked in - a real, tracked 0 still shows as 0,
            this only hides the "no data exists yet" case. */}
        {kpis.hasPlatformData && (
          <>
            <KpiCard label="Total Views" value={kpis.totalViews.toLocaleString()} />
            <KpiCard label="Total Engagement" value={kpis.totalEngagement.toLocaleString()} />
          </>
        )}
        <KpiCard
          label="Avg Engagement Rate"
          value={kpis.avgEngagementRate !== null ? `${kpis.avgEngagementRate.toFixed(1)}%` : "-"}
        />
        {kpis.hasConversions && (
          <>
            <KpiCard label="Total Conversions" value={kpis.totalConversions.toLocaleString()} />
            <KpiCard
              label="Avg Conversion Rate"
              value={kpis.avgConversionRate !== null ? `${kpis.avgConversionRate.toFixed(1)}%` : "-"}
            />
          </>
        )}
        <KpiCard label="Current Streak" value={`${walkStreak} walk / ${postStreak} post`} />
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-muted-foreground">Content Performance Over Time</h2>
        {/* neutral throughout this page's graph panels: aggregate charts
            over all content, not one piece of pillar-tagged content, a
            pillar color implied a categorization that isn't real. */}
        <GlowCard neutral className="mt-2 p-4">
          <PerformanceOverTimeChart data={overTime} />
        </GlowCard>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-muted-foreground">Performance by Pillar</h2>
        <GlowCard neutral className="mt-2 p-4">
          <PerformanceByPillarChart data={byPillar} />
        </GlowCard>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-muted-foreground">Pillar Balance / Consistency</h2>
        <GlowCard neutral className="mt-2 p-4">
          <PillarBalanceChart data={balance.data} />
          {balance.overPosting && (
            <p className="mt-3 text-sm text-amber-600">
              {balance.overPosting} is more than 60% of posts in this range, worth checking
              whether the other pillars are getting neglected.
            </p>
          )}
        </GlowCard>
      </section>

      <p className="mt-8 text-xs text-muted-foreground">
        Hook Type Performance isn&apos;t built yet. Real hook-used data exists now
        (hook_variants.is_live, set by each Packaging hook&apos;s &quot;Use&quot; action), this
        graph itself just hasn&apos;t been built on top of it.
      </p>

      {/* Section 6.4: worth having once there's enough volume, not the
          first thing to see on this page, collapsed by default. */}
      <div className="mt-8">
        <CollapsibleSection title="Secondary Graphs (Month 2+)" neutral>
          <section>
            <h3 className="text-sm font-medium text-muted-foreground">Top Sub-topics</h3>
            <GlowCard neutral className="mt-2 p-4">
              <NamedMetricBarChart data={topSubTopics} emptyLabel="No sub-topic data in this range yet." />
            </GlowCard>
          </section>

          <section>
            <h3 className="text-sm font-medium text-muted-foreground">Content Output Volume Over Time</h3>
            <GlowCard neutral className="mt-2 p-4">
              <OutputVolumeChart data={outputVolume.data} pillars={outputVolume.pillars} />
            </GlowCard>
          </section>

          <section>
            <h3 className="text-sm font-medium text-muted-foreground">Funnel: Reach &rarr; Engagement &rarr; Conversion</h3>
            <GlowCard neutral className="mt-2 p-4">
              <ReachFunnelChart data={funnel} />
            </GlowCard>
          </section>

          <section>
            <h3 className="text-sm font-medium text-muted-foreground">Top Performing Content</h3>
            <GlowCard neutral className="mt-2 p-4">
              <TopPerformingList items={topPerforming} />
            </GlowCard>
          </section>

          <section>
            <h3 className="text-sm font-medium text-muted-foreground">Research-based vs Custom Performance</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">By each item&apos;s live title variant source.</p>
            <GlowCard neutral className="mt-2 p-4">
              <NamedMetricBarChart
                data={researchVsCustom}
                emptyLabel="No live title variants tracked in this range yet."
              />
            </GlowCard>
          </section>

          <section>
            <h3 className="text-sm font-medium text-muted-foreground">Retention Drop Trends</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Earliest vs. latest logged drop point per platform-post (content_platform_stats_snapshots.
              retention_drop_timestamp), full history regardless of the range filter above. Needs at
              least two check-ins with a drop point logged to show a trend.
            </p>
            <GlowCard neutral className="mt-2 p-4">
              {retentionDropTrends.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No platform-post has two check-ins with a drop point logged yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {retentionDropTrends.map((t) => (
                    <li key={`${t.contentId}-${t.platform}`} className="text-sm">
                      <Link href={`/calendar/${t.contentId}`} className="font-medium hover:underline">
                        {t.finalTitle}
                      </Link>
                      <span className="text-muted-foreground"> &middot; {t.platform} &middot; </span>
                      <span
                        className={
                          t.direction === "improving"
                            ? "text-emerald-600"
                            : t.direction === "worsening"
                              ? "text-amber-600"
                              : "text-muted-foreground"
                        }
                      >
                        {formatSecondsAsTimestamp(t.points[0].seconds)} &rarr;{" "}
                        {formatSecondsAsTimestamp(t.points[t.points.length - 1].seconds)} ({t.direction})
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {" "}
                        &middot; {t.points.length} check-ins
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </GlowCard>
          </section>

          <section>
            <h3 className="text-sm font-medium text-muted-foreground">Streak History</h3>
            <GlowCard neutral className="mt-2 p-4">
              <StreakHeatmap cells={streakHeatmap} />
            </GlowCard>
          </section>

          <section>
            <h3 className="text-sm font-medium text-muted-foreground">Idea Source Performance</h3>
            <GlowCard neutral className="mt-2 p-4">
              <NamedMetricBarChart data={ideaSourcePerformance} emptyLabel="No idea source data in this range yet." />
            </GlowCard>
          </section>

          <section>
            <h3 className="text-sm font-medium text-muted-foreground">Repurposing Performance</h3>
            <GlowCard neutral className="mt-2 p-4">
              {repurposing.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing in this range yet.</p>
              ) : (
                <ul className="space-y-2">
                  {repurposing.map((r) => (
                    <li key={r.id} className="text-sm">
                      <Link href={`/calendar/${r.id}`} className="font-medium hover:underline">
                        {r.final_title}
                      </Link>
                      <span className="text-muted-foreground">
                        {" "}
                        - {r.views !== null ? `${r.views.toLocaleString()} views` : "not tracked yet"} &middot;{" "}
                        {r.derivativeCount} derivative
                        {r.derivativeCount === 1 ? "" : "s"} ({r.derivativeViews.toLocaleString()} views)
                      </span>
                      {r.isUntappedLongForm && (
                        <span className="ml-1.5 text-amber-600">untapped repurposing opportunity</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </GlowCard>
          </section>

          <section>
            <h3 className="text-sm font-medium text-muted-foreground">Content Posted Time</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Real posting time per platform (content_platform_posts.published_at), not
              publish_date&apos;s old approximation. Long Form and Short Form shown separately, different
              posting rhythms.
            </p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Long Form</p>
                <GlowCard neutral className="mt-1 p-4">
                  <ContentPostedTimeChart data={contentPostedTime.longForm} />
                </GlowCard>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Short Form</p>
                <GlowCard neutral className="mt-1 p-4">
                  <ContentPostedTimeChart data={contentPostedTime.shortForm} />
                </GlowCard>
              </div>
            </div>
          </section>
        </CollapsibleSection>
      </div>
    </div>
  );
}
