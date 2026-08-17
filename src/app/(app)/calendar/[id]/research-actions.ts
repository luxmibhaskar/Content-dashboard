"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { searchYouTubeSignals } from "@/lib/youtube";

// Section 10.2.3: Refresh Research always inserts a new research_snapshots
// row, it never edits or deletes a prior one, that's what makes History
// possible. Only the YouTube piece is wired up, Google/Reddit/Quora stay
// null until those API keys exist (Section 2.5's prerequisites).
export async function refreshResearch(contentId: string) {
  const supabase = await createClient();

  const { data: item, error: itemError } = await supabase
    .from("content_calendar")
    .select("brand, final_title, raw_idea_title, viewer_keywords_search_phrases")
    .eq("id", contentId)
    .single();
  if (itemError || !item) {
    throw new Error(itemError?.message ?? "Content item not found.");
  }

  const query = item.final_title || item.raw_idea_title || item.viewer_keywords_search_phrases;
  if (!query) {
    throw new Error(
      "Add a title (or at least a raw idea title) before running research, there's nothing to search for yet.",
    );
  }

  const youtubeData = await searchYouTubeSignals(query);
  const summary =
    youtubeData.length > 0
      ? `Pulled ${youtubeData.length} YouTube video${youtubeData.length === 1 ? "" : "s"} for "${query}". Google, Reddit, and Quora aren't wired up yet.`
      : `No YouTube results found for "${query}".`;

  const { error } = await supabase.from("research_snapshots").insert({
    content_id: contentId,
    brand: item.brand,
    youtube_data: youtubeData,
    google_data: null,
    reddit_data: null,
    quora_data: null,
    summary,
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/calendar/${contentId}/research`);
}
