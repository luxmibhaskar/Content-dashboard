import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, BRAND_LABELS, DEFAULT_BRAND, isBrand } from "@/lib/brand";
import Link from "next/link";
import { computeStreak, todayDateKey, type StreakRow } from "@/lib/streaks";
import { localDateKey, currentReviewWeek } from "@/lib/date";
import { StreakStrip } from "@/components/streak-strip";
import { GoalProgressStrip } from "@/components/goal-progress-strip";
import { ServicesPanel } from "@/components/services-panel";
import { getBackupStatuses } from "@/lib/backup-status";
import type { Goal } from "@/lib/types";

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
  const [{ data: goalRows }, { data: viewRows }] = await Promise.all([
    supabase.from("goals").select("id, brand, goal_text, target_metric, target_value, current_value, target_date, status").eq("brand", brand),
    supabase.from("content_calendar").select("views").eq("brand", brand),
  ]);
  const totalViews = (viewRows ?? []).reduce((sum, r) => sum + (r.views ?? 0), 0);
  const goals: Goal[] = (goalRows ?? []).map((g) =>
    g.target_metric === "Views" ? { ...g, current_value: totalViews } : g,
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
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Section 5.0: small, quiet strip above the (future) next-up hero,
          not itself the focal point of this screen. */}
      <StreakStrip
        walkStreak={walkStreak}
        postStreak={postStreak}
        todayLogged={Boolean(todayRow)}
        todayWalked={todayRow?.walked ?? false}
        todayPosted={todayRow?.posted ?? false}
      />

      {/* Section 6.5: same quiet-strip treatment as the streak strip
          above, 2-3 active goals is the realistic use case, not a
          dashboard of its own. */}
      <div className="mt-2">
        <GoalProgressStrip goals={goals} />
      </div>

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

      <h1 className="mt-6 text-2xl font-semibold">Today &middot; {BRAND_LABELS[brand]}</h1>

      {isSunday &&
        (weeklyReviewDone ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Weekly Review done for this week. &#10003;
          </p>
        ) : (
          <Link
            href="/review"
            className="mt-2 block rounded-lg border border-border p-4 hover:bg-muted/50"
          >
            <p className="text-sm font-medium">It&apos;s Sunday - Weekly Review time</p>
            <p className="mt-1 text-sm text-muted-foreground">
              15-20 minutes: scan the week, check pillar balance, glance at retention notes,
              scan the Hook Library, update earned-the-click and non-YouTube numbers.
            </p>
          </Link>
        ))}

      <p className="mt-2 text-muted-foreground">
        The next-up suggestion (the real hero of this screen) is coming once
        Journey Log and the Content Calendar have enough to suggest from.
      </p>

      {/* Section 5.3: collapsed by default, infrastructure stays out of
          sight until deliberately sought, at the very bottom of Today. */}
      <div className="mt-12">
        <ServicesPanel backupStatuses={backupStatuses} />
      </div>
    </div>
  );
}
