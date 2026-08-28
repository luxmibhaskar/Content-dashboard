import { createClient } from "@supabase/supabase-js";
import { BRANDS, type Brand } from "@/lib/brand";
import { isYouTubeGoal } from "@/lib/goals";
import { fetchYouTubeChannelStats } from "@/lib/youtube";
import { localDateKey } from "@/lib/date";

// GROUP J: once-daily YouTube subscriber refresh, folded into the nightly
// backup cron so the number stays fresh without anyone clicking the
// Refresh button. Idempotent: skips a brand whose YouTube goal already
// has a platform_snapshots row for today (a manual save or an earlier
// button press counts, and is not overwritten). Per-brand failures are
// swallowed so this never breaks the backup it rides along with.

type BrandResult = { brand: Brand; status: "updated" | "skipped" | "no-channel" | "error"; detail?: string };

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function refreshYouTubeSnapshotsAllBrands(): Promise<BrandResult[]> {
  const supabase = admin();
  const today = localDateKey(new Date());
  const results: BrandResult[] = [];

  for (const brand of BRANDS) {
    try {
      const { data: goalRows } = await supabase
        .from("goals")
        .select("platform_name, source_ref")
        .eq("brand", brand)
        .not("platform_name", "is", null)
        .not("source_ref", "is", null);

      const goal = (goalRows ?? []).find((g) => isYouTubeGoal(g.platform_name));
      if (!goal?.source_ref || !goal.platform_name) {
        results.push({ brand, status: "no-channel" });
        continue;
      }

      const { data: existing } = await supabase
        .from("platform_snapshots")
        .select("id")
        .eq("brand", brand)
        .eq("platform", goal.platform_name)
        .eq("snapshot_date", today)
        .maybeSingle();
      if (existing) {
        results.push({ brand, status: "skipped", detail: "already has today's snapshot" });
        continue;
      }

      const stats = await fetchYouTubeChannelStats(goal.source_ref);
      const { error } = await supabase.from("platform_snapshots").upsert(
        {
          brand,
          platform: goal.platform_name,
          follower_count: Math.round(stats.subscriberCount),
          snapshot_date: today,
        },
        { onConflict: "brand,platform,snapshot_date" },
      );
      if (error) throw new Error(error.message);
      results.push({ brand, status: "updated", detail: `${stats.subscriberCount} subscribers` });
    } catch (err) {
      results.push({ brand, status: "error", detail: err instanceof Error ? err.message : String(err) });
    }
  }

  return results;
}
