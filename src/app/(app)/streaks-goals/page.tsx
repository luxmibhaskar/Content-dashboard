import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";
import { computeStreak, todayDateKey, type StreakRow } from "@/lib/streaks";
import { localDateKey } from "@/lib/date";
import { getLatestPlatformCounts } from "@/app/actions/platforms";
import { resolveGoalCurrentValues } from "@/lib/goals";
import { StreakLogForm } from "@/components/streak-goals/streak-log-form";
import { PlatformGoalCard } from "@/components/streak-goals/platform-goal-card";
import { AddPlatformGoalForm } from "@/components/streak-goals/add-platform-goal-form";
import type { Goal } from "@/lib/types";

// Streak & Goals redesign: everything that used to live in Dashboard's
// StreakStrip/GoalProgressStrip (both deleted) now lives here instead,
// full editing, not a quiet strip. The Dashboard/top-bar side only ever
// displays, this page is where logging and goal CRUD actually happen.
export default async function StreaksGoalsPage() {
  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - 60);

  const [{ data: streakRows }, { data: goalRows }, { data: viewRows }] = await Promise.all([
    supabase
      .from("daily_streaks")
      .select("streak_date, walked, posted")
      .eq("brand", brand)
      .gte("streak_date", localDateKey(since))
      .order("streak_date", { ascending: false }),
    supabase
      .from("goals")
      .select(
        "id, brand, goal_text, target_metric, target_value, current_value, target_date, status, platform_name, icon_slug, icon_url",
      )
      .eq("brand", brand)
      .order("created_at", { ascending: false }),
    supabase.from("content_calendar").select("views").eq("brand", brand),
  ]);

  const rows: StreakRow[] = streakRows ?? [];
  const walkStreak = computeStreak(rows, "walked");
  const postStreak = computeStreak(rows, "posted");
  const todayRow = rows.find((r) => r.streak_date === todayDateKey());

  const totalViews = (viewRows ?? []).reduce((sum, r) => sum + (r.views ?? 0), 0);
  const latestPlatformCounts = await getLatestPlatformCounts(brand);
  const goals = resolveGoalCurrentValues((goalRows ?? []) as Goal[], totalViews, latestPlatformCounts);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold">Streak and Goals</h1>

      <p className="mt-4 text-sm text-muted-foreground">
        Walk streak: <span className="font-medium text-foreground">{walkStreak}</span>{" "}
        &middot; Posting streak: <span className="font-medium text-foreground">{postStreak}</span>
      </p>

      <div className="mt-4">
        <StreakLogForm todayWalked={todayRow?.walked ?? false} todayPosted={todayRow?.posted ?? false} />
      </div>

      <h2 className="mt-10 text-xl font-bold">Goals</h2>
      <div className="mt-4 space-y-3">
        {goals.map((g, i) => (
          <PlatformGoalCard key={g.id} goal={g} glow={((i % 3) + 1) as 1 | 2 | 3} />
        ))}
        {goals.length === 0 && (
          <p className="text-sm text-muted-foreground">No goals yet, add your first one below.</p>
        )}
        <AddPlatformGoalForm />
      </div>
    </div>
  );
}
