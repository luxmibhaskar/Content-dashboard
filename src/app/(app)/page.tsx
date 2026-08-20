import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, BRAND_LABELS, DEFAULT_BRAND, isBrand } from "@/lib/brand";
import Link from "next/link";
import { computeStreak, todayDateKey, type StreakRow } from "@/lib/streaks";
import { localDateKey, startOfToday, addDays, currentReviewWeek } from "@/lib/date";
import { StreakStrip } from "@/components/streak-strip";
import { GoalProgressStrip } from "@/components/goal-progress-strip";
import { ServicesPanel } from "@/components/services-panel";
import { QuickAccessCards } from "@/components/quick-access-cards";
import { JourneyLogWidget } from "@/components/journey-log-widget";
import { ContentOutputTracker } from "@/components/content-output-tracker";
import { computeOutputCounts, computeFormatBreakdown, publishedDatesOf, type OutputRow } from "@/lib/content-output";
import { getBackupStatuses } from "@/lib/backup-status";
import { GlowCard } from "@/components/glow-card";
import { AudienceGrowthChart } from "@/components/charts/audience-growth-chart";
import { AudienceSecondaryChart } from "@/components/charts/audience-secondary-chart";
import {
  computeAudienceGrowth,
  computeAudienceDistribution,
  computeGrowthVelocity,
  computeOutputVsMilestone,
  type PlatformSnapshotRow,
} from "@/lib/audience-growth";
import type { Goal, JourneyEntry } from "@/lib/types";

export default async function TodayPage() {
  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - 60);

  const { data: streakRows } = await supabase
    .from("daily_streaks")
    .select("streak_date, walked, posted")
    .eq("brand", brand)
    .gte("streak_date", localDateKey(since))
    .order("streak_date", { ascending: false });

  const rows: StreakRow[] = streakRows ?? [];
  const walkStreak = computeStreak(rows, "walked");
  const postStreak = computeStreak(rows, "posted");
  const todayRow = rows.find((r) => r.streak_date === todayDateKey());

  const backupStatuses = await getBackupStatuses();
  const failingBackups = backupStatuses.filter((s) => s.isFailing);

  // Section 6.5: current_value is pulled live from Analytics for Views
  // goals (the one metric this app already tracks), everything else
  // (Subscribers, Revenue, Community Members, Custom) has no tracked
  // source yet, so it stays manual entry.
  const [{ data: goalRows }, { data: viewRows }, { data: journeyRows }, { data: outputRows }, { data: snapshotRows }] =
    await Promise.all([
      supabase
        .from("goals")
        .select("id, brand, goal_text, target_metric, target_value, current_value, target_date, status")
        .eq("brand", brand),
      supabase.from("content_calendar").select("views").eq("brand", brand),
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
  const totalViews = (viewRows ?? []).reduce((sum, r) => sum + (r.views ?? 0), 0);
  const goals: Goal[] = (goalRows ?? []).map((g) =>
    g.target_metric === "Views" ? { ...g, current_value: totalViews } : g,
  );

  const outputCounts = computeOutputCounts((outputRows ?? []) as OutputRow[]);
  const outputBreakdown = computeFormatBreakdown((outputRows ?? []) as OutputRow[]);

  const audienceGrowth = computeAudienceGrowth((snapshotRows ?? []) as PlatformSnapshotRow[]);
  const audienceDistribution = computeAudienceDistribution((snapshotRows ?? []) as PlatformSnapshotRow[]);
  const growthVelocity = computeGrowthVelocity(audienceGrowth);
  const outputVsMilestone = computeOutputVsMilestone(
    audienceGrowth,
    publishedDatesOf((outputRows ?? []) as OutputRow[]),
  );

  // Section 5.1/12: Weekly Review surfaces automatically in Today on
  // Sundays, for the week that just concluded (today).
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
      <div className="grid gap-6 lg:grid-cols-[280px_1fr] lg:items-start">
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
        <div>
          <QuickAccessCards />

          {/* Layout follow-up: the Command Center graphs fill the area
              directly below the Quick Access cards now, instead of
              sitting at the very bottom of the page. */}
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <section>
              <h2 className="text-sm font-medium text-muted-foreground">Total Audience Growth</h2>
              <GlowCard glow={2} className="mt-2 p-4">
                <AudienceGrowthChart data={audienceGrowth} />
              </GlowCard>
            </section>

            <section>
              <h2 className="text-sm font-medium text-muted-foreground">Audience &amp; Output</h2>
              <GlowCard glow={1} className="mt-2 p-4">
                <AudienceSecondaryChart
                  distribution={audienceDistribution}
                  velocity={growthVelocity}
                  outputVsMilestone={outputVsMilestone}
                />
              </GlowCard>
            </section>
          </div>

          {/* Layout follow-up: the Today heading/status column sits
              beside the streak/goal column now, instead of stacked
              above it. */}
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div>
              <h1 className="text-3xl font-bold">Today &middot; {BRAND_LABELS[brand]}</h1>

              {failingBackups.length > 0 && (
                <p className="mt-3 text-sm text-destructive">
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
                  <p className="mt-2 text-sm text-muted-foreground">
                    Weekly Review done for this week. &#10003;
                  </p>
                ) : (
                  <Link href="/review" className="mt-2 block">
                    <GlowCard glow={1} className="p-4 transition-colors hover:bg-muted/30">
                      <p className="text-sm font-medium">It&apos;s Sunday - Weekly Review time</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        15-20 minutes: scan the week, check pillar balance, glance at retention
                        notes, scan the Hook Library, update earned-the-click and non-YouTube
                        numbers.
                      </p>
                    </GlowCard>
                  </Link>
                ))}

              <p className="mt-2 text-muted-foreground">
                The next-up suggestion (the real hero of this screen) is coming once
                Journey Log and the Content Calendar have enough to suggest from.
              </p>
            </div>

            <div>
              {/* Section 5.0: small, quiet strip, not itself the focal
                  point of this screen. */}
              <StreakStrip
                walkStreak={walkStreak}
                postStreak={postStreak}
                todayLogged={Boolean(todayRow)}
                todayWalked={todayRow?.walked ?? false}
                todayPosted={todayRow?.posted ?? false}
              />

              {/* Section 6.5: same quiet-strip treatment as the streak
                  strip above, 2-3 active goals is the realistic use
                  case, not a dashboard of its own. */}
              <div className="mt-2">
                <GoalProgressStrip goals={goals} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 5.3: collapsed by default, infrastructure stays out of
          sight until deliberately sought, at the very bottom of Today. */}
      <div className="mt-12">
        <ServicesPanel backupStatuses={backupStatuses} />
      </div>
    </div>
  );
}
