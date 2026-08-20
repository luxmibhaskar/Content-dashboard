"use server";

import { createClient } from "@/lib/supabase/server";
import { localDateKey } from "@/lib/date";

// Platforms/Streak & Goals consolidation: the old Platforms modal (a
// fixed 4-platform bulk form) is gone, the current-count entry that
// used to live there is now part of each platform goal's own edit
// form (src/components/streak-goals/platform-goal-card.tsx), one
// platform at a time. This still writes the same platform_snapshots
// row the modal used to, same downstream effect (Total Audience
// Growth and the rest of the Command Center graphs read from this
// table), just from a different entry point. Re-saving the same day
// upserts that day's row rather than piling up duplicates, unchanged
// from before.
export async function logPlatformSnapshot(brand: string, platformName: string, count: number) {
  const supabase = await createClient();
  const { error } = await supabase.from("platform_snapshots").upsert(
    {
      brand,
      platform: platformName,
      follower_count: Math.round(count),
      snapshot_date: localDateKey(new Date()),
    },
    { onConflict: "brand,platform,snapshot_date" },
  );

  if (error) throw new Error(error.message);
}

// Latest snapshot per platform, any platform name (not a fixed union
// anymore, see supabase/migrations/0014_platform_snapshots_any_platform.sql),
// keyed by whatever's actually been logged for this brand. Used both
// for the compact top-bar display and for resolving each platform
// goal's current count (src/lib/goals.ts resolveGoalCurrentValues).
export async function getLatestPlatformSnapshots(brand: string): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("platform_snapshots")
    .select("platform, follower_count, snapshot_date")
    .eq("brand", brand)
    .order("snapshot_date", { ascending: false });

  const latest: Record<string, number> = {};
  for (const row of data ?? []) {
    if (!(row.platform in latest)) latest[row.platform] = row.follower_count;
  }
  return latest;
}
