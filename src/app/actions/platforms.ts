"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";
import { PLATFORMS, type Platform } from "@/lib/platforms";
import { localDateKey } from "@/lib/date";

// Command Center redesign, Redesign Phase 2: one snapshot row per
// platform per day. Re-saving the same day upserts that day's row
// (brand, platform, snapshot_date) rather than piling up duplicate
// same-day entries, the count-over-time history stays meaningful.
export async function savePlatformCounts(formData: FormData) {
  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  const snapshotDate = localDateKey(new Date());
  const rows = PLATFORMS.flatMap((platform) => {
    const raw = formData.get(`platform-${platform}`);
    if (raw === null || raw === "") return [];
    const count = Number(raw);
    if (!Number.isFinite(count) || count < 0) return [];
    return [{ brand, platform, follower_count: Math.round(count), snapshot_date: snapshotDate }];
  });

  if (rows.length === 0) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("platform_snapshots")
    .upsert(rows, { onConflict: "brand,platform,snapshot_date" });

  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

// Most recent snapshot per platform, for pre-filling the modal. Reads
// through the app's normal date-descending order rather than a
// distinct-on query, this table stays small enough (one row per
// platform per day, four platforms) that it isn't worth the extra
// Postgres syntax.
export async function getLatestPlatformCounts(brand: string): Promise<Partial<Record<Platform, number>>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("platform_snapshots")
    .select("platform, follower_count, snapshot_date")
    .eq("brand", brand)
    .order("snapshot_date", { ascending: false });

  const latest: Partial<Record<Platform, number>> = {};
  for (const row of data ?? []) {
    const platform = row.platform as Platform;
    if (!(platform in latest)) latest[platform] = row.follower_count;
  }
  return latest;
}
