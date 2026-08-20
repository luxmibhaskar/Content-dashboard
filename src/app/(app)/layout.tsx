import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/top-bar";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";
import { getLatestPlatformCounts } from "@/app/actions/platforms";
import { computeStreak, type StreakRow } from "@/lib/streaks";
import { localDateKey } from "@/lib/date";
import { resolveGoalCurrentValues } from "@/lib/goals";
import type { Goal } from "@/lib/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  const since = new Date();
  since.setDate(since.getDate() - 60);

  // Layout follow-up: streak/goals moved into a compact, always-visible
  // top-bar row, so this fetch (previously only on Dashboard's own
  // page.tsx) now runs here instead, it needs to be on every page, not
  // just Dashboard's.
  const [platformCounts, { data: streakRows }, { data: goalRows }, { data: viewRows }] = await Promise.all([
    getLatestPlatformCounts(brand),
    supabase
      .from("daily_streaks")
      .select("streak_date, walked, posted")
      .eq("brand", brand)
      .gte("streak_date", localDateKey(since)),
    supabase
      .from("goals")
      .select(
        "id, brand, goal_text, target_metric, target_value, current_value, target_date, status, platform_name, icon_slug, icon_url",
      )
      .eq("brand", brand)
      .not("platform_name", "is", null)
      .order("created_at", { ascending: false }),
    supabase.from("content_calendar").select("views").eq("brand", brand),
  ]);

  const streaks: StreakRow[] = streakRows ?? [];
  const walkStreak = computeStreak(streaks, "walked");
  const postStreak = computeStreak(streaks, "posted");
  const totalViews = (viewRows ?? []).reduce((sum, r) => sum + (r.views ?? 0), 0);
  const goals = resolveGoalCurrentValues((goalRows ?? []) as Goal[], totalViews, platformCounts);

  return (
    <div className="flex min-h-svh flex-col">
      <TopBar
        brand={brand}
        userEmail={user.email ?? null}
        platformCounts={platformCounts}
        walkStreak={walkStreak}
        postStreak={postStreak}
        goals={goals}
      />
      <main className="flex-1">{children}</main>
    </div>
  );
}
