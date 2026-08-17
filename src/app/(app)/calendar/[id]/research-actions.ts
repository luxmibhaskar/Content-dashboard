"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { searchYouTubeSignals } from "@/lib/youtube";
import { searchGoogleSignals, searchRedditSignals, searchQuoraSignals } from "@/lib/serpapi";
import type { GoogleSearchSignal, WebSearchResult, YouTubeVideoSignal } from "@/lib/types";

// Section 10.2.3: Refresh Research always inserts a new research_snapshots
// row, it never edits or deletes a prior one, that's what makes History
// possible. Each source is pulled independently and never blocks the
// others, one API having a bad day (rate limit, outage) shouldn't lose
// the sources that worked. Reddit has no approved official API access
// (Section 16), so it runs through the same site-scoped SerpApi search
// the brief already documents for Quora, not a dedicated integration.
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

  const pulled: string[] = [];
  const failed: string[] = [];

  let youtubeData: YouTubeVideoSignal[] = [];
  try {
    youtubeData = await searchYouTubeSignals(query);
    pulled.push(`${youtubeData.length} YouTube video${youtubeData.length === 1 ? "" : "s"}`);
  } catch (err) {
    failed.push(`YouTube (${err instanceof Error ? err.message : "failed"})`);
  }

  let googleData: GoogleSearchSignal | null = null;
  try {
    googleData = await searchGoogleSignals(query);
    pulled.push(
      `${googleData.autocomplete.length} Google autocomplete + ${googleData.peopleAlsoAsk.length} People Also Ask`,
    );
  } catch (err) {
    failed.push(`Google (${err instanceof Error ? err.message : "failed"})`);
  }

  let redditData: WebSearchResult[] = [];
  try {
    redditData = await searchRedditSignals(query);
    pulled.push(`${redditData.length} Reddit thread${redditData.length === 1 ? "" : "s"}`);
  } catch (err) {
    failed.push(`Reddit (${err instanceof Error ? err.message : "failed"})`);
  }

  let quoraData: WebSearchResult[] = [];
  try {
    quoraData = await searchQuoraSignals(query);
    pulled.push(`${quoraData.length} Quora page${quoraData.length === 1 ? "" : "s"}`);
  } catch (err) {
    failed.push(`Quora (${err instanceof Error ? err.message : "failed"})`);
  }

  const summary = [
    `Pulled for "${query}": ${pulled.length > 0 ? pulled.join(", ") : "nothing"}.`,
    failed.length > 0 ? `Failed: ${failed.join(", ")}.` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const { error } = await supabase.from("research_snapshots").insert({
    content_id: contentId,
    brand: item.brand,
    youtube_data: youtubeData,
    google_data: googleData,
    reddit_data: redditData,
    quora_data: quoraData,
    summary,
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/calendar/${contentId}/research`);
}
