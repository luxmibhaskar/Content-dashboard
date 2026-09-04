"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";
import { localDateKey } from "@/lib/date";
import { isYouTubeGoal } from "@/lib/goals";
import { fetchYouTubeVideoDetails, isYouTubeShortsUrl, parseYouTubeVideoId } from "@/lib/youtube";

// docs/topic-page-redesign.md Section 1: a single "+ New" button, no
// pre-form, no pre-paste-popup. Title/Brief Description/Keywords used
// to be collected here (or, on the old Manual entry point, the item's
// creation itself was deferred until a paste succeeded and its title
// derived from that parse) - both of those depended on some input
// existing before the item did. Neither does anymore: that same input
// now lives in the Research phase on both the Manual and AI sides of
// the topic page itself, collected there instead of twice. So creation
// is unconditional and immediate: a blank row, a literal "Untitled"
// title (not left blank, an empty header on a row that's already real
// underneath reads as broken, not as "not polished yet"), straight to
// the new topic page. TopicPageTabs already defaults every topic page
// to the AI area regardless of how the item was created, so this needs
// no entry param to land there, it's already where things land.
export async function createBlankContentItem(format?: "Short" | "Long Video") {
  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_calendar")
    .insert({
      brand,
      final_title: "Untitled",
      raw_idea_title: "Untitled",
      // docs/platform-performance-tracking.md Section 1: seeded from
      // whichever side of the Long Form / Short Form toggle "+ New" was
      // clicked from, so the new item shows up in that same filtered
      // view immediately rather than landing in neither until Format is
      // set by hand on its topic page.
      ...(format ? { format } : {}),
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create content item.");
  }

  redirect(`/calendar/${data.id}`);
}

// docs/platform-performance-tracking.md Section 9.1: the reverse of the
// normal flow above. A Short made and published without ever going
// through Research/Packaging/Scripting still needs a Content Calendar
// row eventually, this creates it straight from the published video
// instead of a blank one, pulling everything YouTube can supply (title,
// description, publish time, current counts) so it isn't retyped by
// hand. Long Video technically works the same way if pasted here, it's
// just not the case this was built for (see isYouTubeShortsUrl).
//
// Returns a result instead of calling redirect() itself: this needs to
// surface a message inline (bad URL, video not found, API error)
// without navigating away from the Calendar list, which redirect()
// inside a try/catch can't do cleanly. The client component that calls
// this navigates to the new item itself on ok:true, same split
// refreshYouTubeVideoStats (platform-stats-actions.ts) already uses for
// the same reason.
//
// Not wrapped in a transaction: three separate inserts, same
// non-transactional shape updateContentItem already has (calendar row,
// then its content_platform_posts row, two independent error checks).
// A failure on the second or third insert leaves an orphaned calendar
// row rather than rolling back - acceptable here the same way it's
// acceptable there, for a single-user tool this isn't worth an RPC
// transaction over.
export async function createContentItemFromYouTube(
  formData: FormData,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const url = String(formData.get("url") ?? "").trim();
  if (!url) {
    return { ok: false, error: "Paste a YouTube video URL first." };
  }

  const videoId = parseYouTubeVideoId(url);
  if (!videoId) {
    return { ok: false, error: "That doesn't look like a YouTube video URL." };
  }

  let details;
  try {
    details = await fetchYouTubeVideoDetails(videoId);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "YouTube lookup failed." };
  }

  const format = isYouTubeShortsUrl(url) ? "Short" : "Long Video";

  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  const supabase = await createClient();

  // The "Posted on" multiselect (format-platform-fields.tsx) matches
  // content_calendar.platform against this brand's own Streak & Goals
  // platform names by exact string, case-sensitively - those names are
  // freeform (whatever was typed into "Add a platform goal"), not
  // guaranteed to be the literal "YouTube" this app uses internally
  // elsewhere. Writing "YouTube" unconditionally would silently fail to
  // show as selected for a brand whose goal is named e.g. "Youtube" or
  // "YT". content_platform_posts.platform doesn't have this problem
  // (isYouTubeGoal, which the Analytics section's "Refresh from
  // YouTube" button gating already uses, matches case-insensitively),
  // but it's written as the same resolved name here too for consistency
  // with what a manual "Posted on" toggle would have saved.
  const { data: goalRows } = await supabase
    .from("goals")
    .select("platform_name")
    .eq("brand", brand)
    .not("platform_name", "is", null);
  const youtubePlatformName =
    (goalRows ?? []).map((g) => g.platform_name as string).find(isYouTubeGoal) ?? "YouTube";

  const { data: item, error: itemError } = await supabase
    .from("content_calendar")
    .insert({
      brand,
      final_title: details.title,
      raw_idea_title: details.title,
      // "Short description" - only meaningful (and only ever shown) for
      // Short format, same "field's only meaning is short-form" reasoning
      // updateContentItem already applies to this exact column.
      final_description: format === "Short" ? details.description || null : null,
      production_status: "Published / Scheduled",
      format,
      platform: [youtubePlatformName],
      publish_date: details.publishedAt,
    })
    .select("id")
    .single();

  if (itemError || !item) {
    return { ok: false, error: itemError?.message ?? "Failed to create content item." };
  }

  const { data: post, error: postError } = await supabase
    .from("content_platform_posts")
    .insert({
      content_id: item.id,
      brand,
      platform: youtubePlatformName,
      published_at: details.publishedAt,
      post_url: url,
    })
    .select("id")
    .single();

  if (postError || !post) {
    return {
      ok: false,
      error: `Content item created, but saving its YouTube post record failed: ${postError?.message ?? "unknown error"}.`,
    };
  }

  const { error: snapshotError } = await supabase.from("content_platform_stats_snapshots").insert({
    content_platform_post_id: post.id,
    brand,
    snapshot_date: localDateKey(new Date()),
    views: details.viewCount,
    likes: details.likeCount,
    comments: details.commentCount,
  });

  if (snapshotError) {
    return {
      ok: false,
      error: `Content item created, but saving its initial stats failed: ${snapshotError.message}.`,
    };
  }

  revalidatePath("/calendar");
  return { ok: true, id: item.id };
}
