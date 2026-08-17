import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";
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
  type ContentMetricsRow,
} from "@/lib/analytics";
import { computeStreak, type StreakRow } from "@/lib/streaks";
import { KpiCard } from "@/components/kpi-card";
import { PerformanceOverTimeChart } from "@/components/charts/performance-over-time-chart";
import { PerformanceByPillarChart } from "@/components/charts/performance-by-pillar-chart";
import { PillarBalanceChart } from "@/components/charts/pillar-balance-chart";
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
    .select("pillar, publish_date, production_status, views, likes, comments, shares, saves, conversions")
    .eq("brand", brand)
    .eq("is_archived", false);

  if (from && to) {
    contentQuery = contentQuery.gte("publish_date", from).lte("publish_date", `${to}T23:59:59`);
  }

  const [{ data: contentRows }, { data: streakRows }] = await Promise.all([
    contentQuery,
    supabase.from("daily_streaks").select("streak_date, walked, posted").eq("brand", brand),
  ]);

  const rows = (contentRows ?? []) as ContentMetricsRow[];
  const kpis = computeKpis(rows);
  const overTime = computePerformanceOverTime(rows);
  const byPillar = computePerformanceByPillar(rows);
  const balance = computePillarBalance(rows);

  const streaks = (streakRows ?? []) as StreakRow[];
  const walkStreak = computeStreak(streaks, "walked");
  const postStreak = computeStreak(streaks, "posted");

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Analytics Overview</h1>

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
        <KpiCard label="Total Views" value={kpis.totalViews.toLocaleString()} />
        <KpiCard label="Total Engagement" value={kpis.totalEngagement.toLocaleString()} />
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
        <div className="mt-2 rounded-lg border border-border p-4">
          <PerformanceOverTimeChart data={overTime} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-muted-foreground">Performance by Pillar</h2>
        <div className="mt-2 rounded-lg border border-border p-4">
          <PerformanceByPillarChart data={byPillar} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-muted-foreground">Pillar Balance / Consistency</h2>
        <div className="mt-2 rounded-lg border border-border p-4">
          <PillarBalanceChart data={balance.data} />
          {balance.overPosting && (
            <p className="mt-3 text-sm text-amber-600">
              {balance.overPosting} is more than 60% of posts in this range, worth checking
              whether the other pillars are getting neglected.
            </p>
          )}
        </div>
      </section>

      <p className="mt-8 text-xs text-muted-foreground">
        Hook Type Performance isn&apos;t built yet, it depends on Phase 2&apos;s Title/Hook/Thumbnail
        variants (the hook actually used has to come from a live variant, not a separate field).
      </p>
    </div>
  );
}
