"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function num(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) ?? "");
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null;
}

function str(formData: FormData, key: string): string | null {
  return String(formData.get(key) ?? "") || null;
}

// docs/platform-performance-tracking.md Section 4: the per-item
// Analytics section's "Log a check-in" mini form, one per platform-post,
// same spirit as logPastPlatformSnapshot (src/app/actions/platforms.ts)
// and its own "Log a past count" UI: a real date input, not hardcoded to
// today, so real history can be seeded rather than only ever
// accumulating forward. Upsert on (content_platform_post_id,
// snapshot_date) so re-logging the same day corrects that day's numbers
// rather than erroring or creating a duplicate row. Every metric field
// is independently optional (a check-in can log whatever's actually
// available that day), matching content_platform_stats_snapshots'
// schema and the old single-snapshot performance fields' own "each
// field independently optional" spirit.
export async function logPlatformStatsSnapshot(
  contentPlatformPostId: string,
  contentId: string,
  brand: string,
  formData: FormData,
) {
  const snapshotDate = String(formData.get("snapshot_date") ?? "");
  if (!snapshotDate) return;

  const supabase = await createClient();
  const { error } = await supabase.from("content_platform_stats_snapshots").upsert(
    {
      content_platform_post_id: contentPlatformPostId,
      brand,
      snapshot_date: snapshotDate,
      views: num(formData, "views"),
      likes: num(formData, "likes"),
      comments: num(formData, "comments"),
      saves: num(formData, "saves"),
      shares: num(formData, "shares"),
      reposts: num(formData, "reposts"),
      // Analytics audit (2026-08-27) Phase 3: free text, e.g. "2:15",
      // one reading per check-in so it's possible to see the drop point
      // move earlier or later over time (src/lib/retention-drop.ts).
      retention_drop_timestamp: str(formData, "retention_drop_timestamp"),
      retention_drop_note: str(formData, "retention_drop_note"),
    },
    { onConflict: "content_platform_post_id,snapshot_date" },
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/calendar/${contentId}`);
}
