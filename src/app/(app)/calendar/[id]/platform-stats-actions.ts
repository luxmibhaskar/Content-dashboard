"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { localDateKey } from "@/lib/date";
import { fetchYouTubeVideoStats, parseYouTubeVideoId } from "@/lib/youtube";
import { findDuplicateVideoPost } from "@/lib/duplicate-video";

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

// GROUP I: "paste the published YouTube URL once after publishing"
// becomes the reliable content-item-to-video link, deliberately not
// automatic title-matching (titles can be edited, and more than one
// video can share a similar one). Plain URL save, no video-id
// validation here, that only matters at refresh time
// (refreshYouTubeVideoStats below); saving an unrecognized URL just
// means that button will error until it's corrected, rather than
// blocking the save itself.
//
// Duplicate check (per explicit instruction): unlike "+ From YouTube",
// which always creates a brand-new item and blocks a duplicate outright,
// this edits a single field on an item that already exists, so a
// collision here gets a warn-and-confirm instead of a hard block -
// findDuplicateVideoPost's own comment (src/lib/duplicate-video.ts) has
// the full "why this can happen at all" context. confirmDuplicate lets
// the same form resubmit past that warning once the user has seen it,
// via a "Save anyway" button (platform-analytics-section.tsx).
export async function updatePlatformPostUrl(
  contentPlatformPostId: string,
  contentId: string,
  brand: string,
  formData: FormData,
): Promise<
  | { ok: true }
  | { ok: false; kind: "duplicate"; error: string }
  | { ok: false; kind: "error"; error: string }
> {
  const postUrl = String(formData.get("post_url") ?? "").trim() || null;
  const confirmDuplicate = formData.get("confirm_duplicate") === "true";

  const supabase = await createClient();

  if (postUrl && !confirmDuplicate) {
    const videoId = parseYouTubeVideoId(postUrl);
    if (videoId) {
      const duplicate = await findDuplicateVideoPost(supabase, brand, videoId, contentId);
      if (duplicate) {
        return {
          ok: false,
          kind: "duplicate",
          error: `This video is already linked to "${duplicate.title || "Untitled"}".`,
        };
      }
    }
  }

  const { error } = await supabase
    .from("content_platform_posts")
    .update({ post_url: postUrl })
    .eq("id", contentPlatformPostId);

  if (error) {
    return { ok: false, kind: "error", error: error.message };
  }

  revalidatePath(`/calendar/${contentId}`);
  return { ok: true };
}

// GROUP I: on-demand per-video stats pull, sibling to Group J's
// refreshYouTubeSnapshot (src/app/actions/platforms.ts) at the video
// level instead of the channel level. Writes into
// content_platform_stats_snapshots the same way a manual check-in
// would (upsert on content_platform_post_id,snapshot_date), so a
// refresh and a same-day manual edit never conflict, whichever
// happened last today wins, matching Group J's own stated behavior.
// saves/shares/reposts are left untouched (not zeroed) since the
// YouTube API has no equivalent for them and an upsert only needs to
// specify the columns it actually knows.
export async function refreshYouTubeVideoStats(
  contentPlatformPostId: string,
  contentId: string,
  brand: string,
): Promise<{ ok: true; views: number } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: post, error: postError } = await supabase
    .from("content_platform_posts")
    .select("post_url")
    .eq("id", contentPlatformPostId)
    .single();
  if (postError || !post) {
    return { ok: false, error: postError?.message ?? "Platform post not found." };
  }
  if (!post.post_url) {
    return { ok: false, error: "Paste the video's YouTube URL first." };
  }

  const videoId = parseYouTubeVideoId(post.post_url);
  if (!videoId) {
    return { ok: false, error: "That doesn't look like a YouTube video URL." };
  }

  try {
    const stats = await fetchYouTubeVideoStats(videoId);
    const { error } = await supabase.from("content_platform_stats_snapshots").upsert(
      {
        content_platform_post_id: contentPlatformPostId,
        brand,
        snapshot_date: localDateKey(new Date()),
        views: stats.viewCount,
        likes: stats.likeCount,
        comments: stats.commentCount,
      },
      { onConflict: "content_platform_post_id,snapshot_date" },
    );
    if (error) throw new Error(error.message);

    revalidatePath(`/calendar/${contentId}`);
    return { ok: true, views: stats.viewCount };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "YouTube refresh failed." };
  }
}
