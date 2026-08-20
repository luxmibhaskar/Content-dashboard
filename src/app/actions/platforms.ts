"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";
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
async function upsertSnapshot(brand: string, platformName: string, count: number, snapshotDate: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("platform_snapshots").upsert(
    { brand, platform: platformName, follower_count: Math.round(count), snapshot_date: snapshotDate },
    { onConflict: "brand,platform,snapshot_date" },
  );

  if (error) throw new Error(error.message);
}

export async function logPlatformSnapshot(brand: string, platformName: string, count: number) {
  await upsertSnapshot(brand, platformName, count, localDateKey(new Date()));
}

// "Log a past count" (src/components/streak-goals/platform-goal-card.tsx),
// same spirit as the streak backfill: seeding real history for a
// platform that's only just being added to the dashboard, rather than
// only ever accumulating forward from today. Bound to the goal's
// platform_name from the card, brand comes from the cookie like every
// other action here, snapshot_date is a real date input, not hardcoded
// to today.
export async function logPastPlatformSnapshot(platformName: string, formData: FormData) {
  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  const snapshotDate = String(formData.get("snapshot_date") ?? "");
  const raw = formData.get("count");
  if (!snapshotDate || raw === null || raw === "") return;
  const count = Number(raw);
  if (!Number.isFinite(count) || count < 0) return;

  await upsertSnapshot(brand, platformName, count, snapshotDate);
  revalidatePath("/", "layout");
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
