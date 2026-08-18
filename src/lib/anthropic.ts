import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { WebSearchResult } from "@/lib/serpapi";
import type {
  GoogleSearchSignal,
  ResearchSynthesisResult,
  YouTubeVideoSignal,
} from "@/lib/types";

const client = new Anthropic();

export type AlternativesVerdict = {
  findingsSummary: string;
  verdict: string;
};

// Section 5.3: "Check Alternatives" feeds SerpApi results through AI
// synthesis, a related but separate function from the content-research
// pipeline, not that pipeline repurposed as-is. Pure information, never
// switches anything automatically.
export async function synthesizeServiceAlternatives(
  serviceName: string,
  currentTier: string,
  searchResults: WebSearchResult[],
): Promise<AlternativesVerdict> {
  const context = searchResults
    .slice(0, 8)
    .map((r) => `- ${r.title}: ${r.snippet ?? ""} (${r.link})`)
    .join("\n");

  const message = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 1024,
    output_config: { effort: "low" },
    system:
      "You compare backend/SaaS service alternatives for a solo developer's personal dashboard. Be concrete and honest, flag low-confidence or thin search results rather than fabricating specifics.",
    messages: [
      {
        role: "user",
        content: `Current service: ${serviceName} (current tier: ${currentTier}).\n\nWeb search results on alternatives:\n${context || "(no results found)"}\n\nSummarize 2-3 real alternatives found in the results, their free tier and paid starting price if mentioned, in under 150 words. If the results don't actually name real alternatives, say so plainly instead of guessing. End your response with one final line formatted exactly as:\nVerdict: <one short sentence - worth switching, current pick is still solid, or worth testing first>`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  const full = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";

  const verdictMatch = full.match(/Verdict:\s*(.+)$/im);
  return {
    findingsSummary: full.replace(/\n?Verdict:.+$/im, "").trim(),
    verdict: verdictMatch?.[1]?.trim() ?? "Unable to determine a verdict from the search results.",
  };
}

// Hook generation: the real signal worth chasing is what made a video
// actually break through, not what's merely competent. A video counts as
// an outlier when it's ~10x or more above the average view count of
// everything else in this pull, "typical for the topic" as approximated
// by the pulled result set itself (per-channel history isn't fetched
// anywhere in this app, only a topic-scoped top-10 search, so "typical
// for the channel" isn't available data, this is an honest, disclosed
// narrower version of that ask, not a silent one).
const OUTLIER_MULTIPLIER = 10;

function detectOutlierVideos(videos: YouTubeVideoSignal[]): {
  outliers: YouTubeVideoSignal[];
  meanViews: number;
} {
  const withViews = videos.filter(
    (v): v is YouTubeVideoSignal & { viewCount: number } => v.viewCount !== null,
  );
  if (withViews.length === 0) return { outliers: [], meanViews: 0 };

  const meanViews = withViews.reduce((sum, v) => sum + v.viewCount, 0) / withViews.length;
  if (meanViews <= 0) return { outliers: [], meanViews };

  const outliers = withViews.filter((v) => v.viewCount >= meanViews * OUTLIER_MULTIPLIER);
  return { outliers, meanViews };
}

const ResearchSynthesisSchema = z.object({
  titles: z.array(z.string()).max(3),
  hooks: z.array(z.object({ text: z.string(), basedOnOutlier: z.boolean() })).max(3),
  thumbnails: z
    .array(
      z.object({
        concept: z.string(),
        main_text_on_image: z.string(),
        visual_elements: z.string(),
        emotion_vibe: z.string(),
      }),
    )
    .max(3),
  formatFit: z.enum(["short", "long", "both"]),
  formatReason: z.string(),
  fullScript: z.string().nullable(),
  mainPointers: z.array(z.object({ point_text: z.string(), landing_line: z.string().nullable() })).nullable(),
  confidenceNote: z.string().nullable(),
});

function formatVideo(v: YouTubeVideoSignal): string {
  const views = v.viewCount !== null ? v.viewCount.toLocaleString() : "unknown views";
  const comments = v.topComments.length > 0 ? `\n  Top comments: ${v.topComments.join(" | ")}` : "";
  return `- "${v.title}" (${v.channelTitle}, ${views})\n  Description: ${v.description || "(none)"}${comments}`;
}

// Section 10.1.3/10.1.5: Run Research's AI step. Generates ranked
// title/hook/thumbnail suggestions (hooks specifically from outlier
// videos when any exist in this pull, not averaged from everything) and
// a script sized to whatever format the research and title actually
// support, never both by default.
export async function synthesizeResearch(params: {
  title: string;
  briefIntent: string | null;
  youtubeData: YouTubeVideoSignal[];
  googleData: GoogleSearchSignal | null;
  redditData: WebSearchResult[];
  quoraData: WebSearchResult[];
}): Promise<ResearchSynthesisResult> {
  const { outliers, meanViews } = detectOutlierVideos(params.youtubeData);

  const outlierBlock =
    outliers.length > 0
      ? `Outlier videos (view count is ${OUTLIER_MULTIPLIER}x+ this pull's average of ${Math.round(meanViews).toLocaleString()} views, genuinely breaking through, not just competent):\n${outliers.map(formatVideo).join("\n")}\n\nBase your suggested hooks specifically on what these outlier videos did in their title/opening framing, not on the average of all results below.`
      : `No video in this pull reached ${OUTLIER_MULTIPLIER}x this pull's average view count (${Math.round(meanViews).toLocaleString()}), nothing here clearly broke through. Base hooks on general patterns across the top results instead, and say so plainly in confidenceNote as a lower-confidence basis.`;

  const allVideosBlock =
    params.youtubeData.length > 0
      ? params.youtubeData.map(formatVideo).join("\n")
      : "(no YouTube results in this pull)";

  const google = params.googleData;
  const googleBlock = google
    ? `Autocomplete: ${google.autocomplete.join(", ") || "(none)"}\nPeople Also Ask: ${google.peopleAlsoAsk.map((q) => q.question).join(" | ") || "(none)"}\nRelated searches: ${google.relatedSearches.join(", ") || "(none)"}`
    : "(no Google results in this pull)";

  const redditBlock =
    params.redditData.length > 0
      ? params.redditData.map((r) => `- ${r.title}${r.snippet ? `: ${r.snippet}` : ""}`).join("\n")
      : "(no Reddit results in this pull)";

  const quoraBlock =
    params.quoraData.length > 0
      ? params.quoraData.map((q) => `- ${q.title}${q.snippet ? `: ${q.snippet}` : ""}`).join("\n")
      : "(no Quora results in this pull)";

  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 8000,
    output_config: { effort: "medium", format: zodOutputFormat(ResearchSynthesisSchema) },
    system:
      "You are a YouTube/short-form content strategist helping a solo creator plan a video. You have no access to video transcripts, only titles, descriptions, and top comments, so hooks must be inferred from that, never presented as a literal transcript quote. Flag thin or low-confidence research in confidenceNote rather than inventing specifics, never fabricate numbers, quotes, or details not present in the research provided.",
    messages: [
      {
        role: "user",
        content: `Topic title: ${params.title}
Creator's brief intent: ${params.briefIntent || "(not provided)"}

YouTube results, top ranking videos for this topic:
${allVideosBlock}

${outlierBlock}

Google search behavior:
${googleBlock}

Reddit discussion:
${redditBlock}

Quora questions:
${quoraBlock}

Generate:
1. Up to 3 ranked title suggestions.
2. Up to 3 ranked hook suggestions (the opening framing for the first few seconds), basedOnOutlier true only for ones actually drawn from the outlier videos above.
3. Up to 3 thumbnail concepts.
4. formatFit: judge whether this topic fits a short-form video, a long-form video, or genuinely supports both as separate treatments, using whatever signal the research and the title itself actually give you (topic breadth implied by People Also Ask, phrasing like "quick tip" vs "complete guide", how much there really is to cover). Do not default to "both" out of caution, only mark it if the topic truly supports two distinct treatments. Give a one-line formatReason either way.
5. Based on that judgment: if formatFit is "long" or "both", write fullScript, a complete word-for-word script with brief delivery notes (what to emphasize, pacing). If formatFit is "short" or "both", write mainPointers, 4-8 pointer-style beats (point_text plus an optional landing_line that closes each point cleanly). Leave the other one null, don't generate a version the format judgment doesn't call for.
6. confidenceNote: one line if the research anywhere above is thin, sparse, or unclear, otherwise null.`,
      },
    ],
  });

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new Error("Research synthesis did not return a parseable result.");
  }

  // Enforced in code, not just prompted: the model doesn't reliably
  // follow "only mark basedOnOutlier true for outlier-derived hooks"
  // when no outlier actually exists in this pull (observed marking a
  // hook outlier-based with no outlier videos listed at all). Since
  // outliers.length is already known deterministically, don't trust a
  // claim the data itself can't back up.
  if (outliers.length === 0) {
    parsed.hooks = parsed.hooks.map((h) => ({ ...h, basedOnOutlier: false }));
  }

  return parsed;
}
