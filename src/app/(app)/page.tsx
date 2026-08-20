import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";
import Link from "next/link";
import { localDateKey, startOfToday, addDays, currentReviewWeek } from "@/lib/date";
import { ServicesPanel } from "@/components/services-panel";
import { QuickAccessCards } from "@/components/quick-access-cards";
import { JourneyLogWidget } from "@/components/journey-log-widget";
import { ContentOutputTracker } from "@/components/content-output-tracker";
import { computeOutputCounts, computeFormatBreakdown, publishedDatesOf, type OutputRow } from "@/lib/content-output";
import { getBackupStatuses } from "@/lib/backup-status";
import { GlowCard } from "@/components/glow-card";
import { AudienceGraphsPanel } from "@/components/audience-graphs-panel";
import {
  computeAudienceGrowth,
  computeAudienceDistribution,
  computeGrowthVelocity,
  computeOutputVsMilestone,
  type PlatformSnapshotRow,
} from "@/lib/audience-growth";
import type { JourneyEntry } from "@/lib/types";

// Streak & Goals redesign: the "Dashboard · Brand" heading and the
// next-up-suggestion placeholder are gone entirely (item 1), not moved
// elsewhere. Streak/goals display also left this page for good, it now
// lives in the top bar (src/components/top-bar.tsx,
// src/components/streak-goals-bar.tsx), with the actual logging and
// goal editing on their own page (/streaks-goals). Nothing here needs
// daily_streaks or goals data anymore.
export default async function TodayPage() {
  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  const supabase = await createClient();

  const backupStatuses = await getBackupStatuses();
  const failingBackups = backupStatuses.filter((s) => s.isFailing);

  const [{ data: journeyRows }, { data: outputRows }, { data: snapshotRows }] = await Promise.all([
    // Command Center sidebar: most recent Journey Log entries, the full
    // filterable page stays at /journey (linked via "View all" below).
    supabase
      .from("journey_log")
      .select(
        "id, brand, entry_date, pillar_focus, sub_topic, what_i_did_experienced, key_lesson_insight, tags_keywords, angle_worthy",
      )
      .eq("brand", brand)
      .order("entry_date", { ascending: false })
      .limit(6),
    // 26 weeks covers both the Content Output Tracker's own three
    // windows (Last 30 Days / This Month / This Week, each computed by
    // filtering this same set further) and Redesign Phase 3's Output vs
    // Milestone graph, which needs enough weekly history to be worth
    // charting at all.
    supabase
      .from("content_calendar")
      .select("production_status, publish_date, format")
      .eq("brand", brand)
      .eq("production_status", "Published / Scheduled")
      .gte("publish_date", localDateKey(addDays(startOfToday(), -181))),
    // Redesign Phase 3's audience-growth graphs. Unbounded: at most 4
    // rows/day (one per platform in src/lib/platforms.ts), this table
    // stays small for a very long time.
    supabase
      .from("platform_snapshots")
      .select("platform, follower_count, snapshot_date")
      .eq("brand", brand),
  ]);

  const outputCounts = computeOutputCounts((outputRows ?? []) as OutputRow[]);
  const outputBreakdown = computeFormatBreakdown((outputRows ?? []) as OutputRow[]);

  const audienceGrowth = computeAudienceGrowth((snapshotRows ?? []) as PlatformSnapshotRow[]);
  const audienceDistribution = computeAudienceDistribution((snapshotRows ?? []) as PlatformSnapshotRow[]);
  const growthVelocity = computeGrowthVelocity(audienceGrowth);
  const outputVsMilestone = computeOutputVsMilestone(
    audienceGrowth,
    publishedDatesOf((outputRows ?? []) as OutputRow[]),
  );

  // Section 5.1/12: Weekly Review surfaces automatically on Dashboard
  // on Sundays, for the week that just concluded (today).
  const isSunday = new Date().getDay() === 0;
  const reviewWeek = currentReviewWeek();
  let weeklyReviewDone = false;
  if (isSunday) {
    const { data: existingReview } = await supabase
      .from("weekly_reviews")
      .select("id")
      .eq("brand", brand)
      .eq("week_start_date", reviewWeek.start)
      .maybeSingle();
    weeklyReviewDone = Boolean(existingReview);
  }

  return (
    <div className="w-full max-w-[90rem] mx-auto px-4 py-10">
      {/* Layout bug fix: default (stretch) alignment now, was
          lg:items-start. With the old Dashboard heading/next-up column
          gone, the main column had nothing forcing it to match the
          sidebar's height, stretch plus the main column's own
          flex-col/flex-1 below makes the two columns end at the same
          bottom edge again, whichever is naturally taller still wins
          (e.g. once the optional backup-warning/weekly-review blocks
          are present). */}
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Command Center sidebar: two equal-height containers, Journey
            Log on top (moved here from its old nav position), Content
            Output Tracker below it. */}
        <div className="flex flex-col gap-6 lg:h-[640px]">
          <GlowCard glow={2} fill className="min-h-0 flex-1 p-4">
            <JourneyLogWidget entries={(journeyRows ?? []) as JourneyEntry[]} />
          </GlowCard>
          <GlowCard glow={3} fill className="min-h-0 flex-1 p-4">
            <ContentOutputTracker counts={outputCounts} breakdown={outputBreakdown} />
          </GlowCard>
        </div>

        {/* Command Center main area */}
        <div className="flex flex-col">
          <QuickAccessCards />

          {/* Layout follow-up: one merged graphs container directly
              below the Quick Access cards (previously two separate
              cards). Total Audience Growth stays permanently visible on
              one side; the toggle sits alongside it, so exactly two
              graphs are ever visible together, Total Audience Growth
              plus whichever of the toggle's three views is selected.
              Relative width is user-adjustable and persists, see
              AudienceGraphsPanel. flex-1 (plus AudienceGraphsPanel's own
              fill) is the actual layout-bug fix: this now grows to
              match the sidebar's height instead of sizing to its own
              (shorter) content and leaving a gap below it. */}
          <div className="mt-8 min-h-0 flex-1">
            <AudienceGraphsPanel
              audienceGrowth={audienceGrowth}
              distribution={audienceDistribution}
              velocity={growthVelocity}
              outputVsMilestone={outputVsMilestone}
            />
          </div>

          {failingBackups.length > 0 && (
            <p className="mt-8 text-sm text-destructive">
              {failingBackups.map((s) => s.label).join(" and ")}{" "}
              {failingBackups.length === 1 ? "backup hasn't" : "backups haven't"} synced
              successfully in the last 2 attempts.{" "}
              {failingBackups[0].lastSyncedAt
                ? `Last known good sync: ${new Date(failingBackups[0].lastSyncedAt).toLocaleDateString()}.`
                : "No successful sync on record yet."}
            </p>
          )}

          {isSunday &&
            (weeklyReviewDone ? (
              <p className="mt-8 text-sm text-muted-foreground">
                Weekly Review done for this week. &#10003;
              </p>
            ) : (
              <Link href="/review" className="mt-8 block">
                <GlowCard glow={1} className="p-4 transition-colors hover:bg-muted/30">
                  <p className="text-sm font-medium">It&apos;s Sunday - Weekly Review time</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    15-20 minutes: scan the week, check pillar balance, glance at retention notes,
                    scan the Hook Library, update earned-the-click and non-YouTube numbers.
                  </p>
                </GlowCard>
              </Link>
            ))}
        </div>
      </div>

      {/* Section 5.3: collapsed by default, infrastructure stays out of
          sight until deliberately sought, at the very bottom of Dashboard. */}
      <div className="mt-12">
        <ServicesPanel backupStatuses={backupStatuses} />
      </div>
    </div>
  );
}
