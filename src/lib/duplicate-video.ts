import type { createClient } from "@/lib/supabase/server";
import { parseYouTubeVideoId } from "@/lib/youtube";

export type DuplicateVideoMatch = {
  contentId: string;
  title: string | null;
};

// Shared by both entry points that write content_platform_posts.post_url
// ("+ From YouTube" in calendar/actions.ts, and the per-item "Save link"
// field in platform-stats-actions.ts): content_platform_posts has no
// uniqueness on post_url itself (unique (content_id, platform) from
// 0018_content_platform_posts.sql only stops one item from getting two
// rows for the same platform), so nothing else prevents the same video
// being linked from two different Calendar items. Matches by parsed
// video id rather than raw string equality, since youtu.be/XXXX,
// youtube.com/watch?v=XXXX, and youtube.com/shorts/XXXX can all name the
// same video under different URL shapes. Scoped to brand: the two brands
// are separate channels, a real cross-brand collision on one video isn't
// a case worth widening the query for.
export async function findDuplicateVideoPost(
  supabase: Awaited<ReturnType<typeof createClient>>,
  brand: string,
  videoId: string,
  excludeContentId?: string,
): Promise<DuplicateVideoMatch | null> {
  const { data } = await supabase
    .from("content_platform_posts")
    .select("content_id, post_url, content_calendar:content_id(final_title)")
    .eq("brand", brand)
    .not("post_url", "is", null);

  for (const row of data ?? []) {
    if (excludeContentId && row.content_id === excludeContentId) continue;
    if (parseYouTubeVideoId(row.post_url as string) === videoId) {
      const linked = row.content_calendar as unknown as { final_title: string | null } | null;
      return { contentId: row.content_id as string, title: linked?.final_title ?? null };
    }
  }

  return null;
}
