"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { searchYouTubeSignals } from "@/lib/youtube";
import { searchGoogleSignals, searchRedditSignals, searchQuoraSignals } from "@/lib/serpapi";
import { synthesizeResearch } from "@/lib/anthropic";
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
    .select(
      "brand, final_title, raw_idea_title, viewer_keywords_search_phrases, brief_intent, full_script, main_pointers",
    )
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

  // Section 10.1.3/10.1.5 AI step: ranked title/hook (outlier-aware)/
  // thumbnail suggestions plus a format-fit script. Wrapped separately
  // from the pulls above, a synthesis failure (model error, refusal,
  // parse miss) shouldn't lose research that already pulled fine.
  let synthesisNote: string | null = null;
  try {
    const synthesis = await synthesizeResearch({
      title: query,
      briefIntent: item.brief_intent,
      youtubeData,
      googleData,
      redditData,
      quoraData,
    });

    const inserts: PromiseLike<{ error: { message: string } | null }>[] = [];

    if (synthesis.titles.length > 0) {
      inserts.push(
        supabase.from("title_variants").insert(
          synthesis.titles.map((text, i) => ({
            content_id: contentId,
            brand: item.brand,
            variant_text: text,
            rank: i + 1,
            source: "Research-based",
          })),
        ),
      );
    }

    if (synthesis.hooks.length > 0) {
      inserts.push(
        supabase.from("hook_variants").insert(
          synthesis.hooks.map((h, i) => ({
            content_id: contentId,
            brand: item.brand,
            variant_text: h.basedOnOutlier ? `${h.text} (from an outlier video)` : h.text,
            rank: i + 1,
            source: "Research-based",
          })),
        ),
      );
    }

    if (synthesis.thumbnails.length > 0) {
      inserts.push(
        supabase.from("thumbnail_variants").insert(
          synthesis.thumbnails.map((t, i) => ({
            content_id: contentId,
            brand: item.brand,
            rank: i + 1,
            source: "Research-based",
            concept: t.concept,
            main_text_on_image: t.main_text_on_image,
            visual_elements: t.visual_elements,
            emotion_vibe: t.emotion_vibe,
          })),
        ),
      );
    }

    const results = await Promise.all(inserts);
    for (const { error: insertError } of results) {
      if (insertError) throw new Error(insertError.message);
    }

    // full_script/main_pointers only fill in when currently empty, a
    // hand-edited script never gets silently overwritten by a later
    // research refresh, matching how Research-based title/hook/
    // thumbnail suggestions already only ever append, never replace.
    const existingMainPoints = Array.isArray(item.main_pointers) ? item.main_pointers : [];
    const contentUpdate: Record<string, unknown> = {
      format_recommendation: `${synthesis.formatFit}: ${synthesis.formatReason}`,
    };
    if (!item.full_script && synthesis.fullScript) {
      contentUpdate.full_script = synthesis.fullScript;
    }
    if (existingMainPoints.length === 0 && synthesis.mainPointers) {
      contentUpdate.main_pointers = synthesis.mainPointers.map((p) => ({
        point_text: p.point_text,
        landing_line: p.landing_line,
        runtime_estimate_seconds: null,
      }));
    }

    const { error: updateError } = await supabase
      .from("content_calendar")
      .update(contentUpdate)
      .eq("id", contentId);
    if (updateError) throw new Error(updateError.message);

    if (synthesis.confidenceNote) {
      synthesisNote = synthesis.confidenceNote;
    }
  } catch (err) {
    synthesisNote = `AI synthesis failed (${err instanceof Error ? err.message : "unknown error"}), raw research below still saved.`;
  }

  const summary = [
    `Pulled for "${query}": ${pulled.length > 0 ? pulled.join(", ") : "nothing"}.`,
    failed.length > 0 ? `Failed: ${failed.join(", ")}.` : null,
    synthesisNote,
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
