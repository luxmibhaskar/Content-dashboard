import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { WebSearchResult } from "@/lib/serpapi";
import type { ResearchCopyResult } from "@/lib/types";

// A stuck request previously ran 10+ minutes before ever failing or
// returning, burning real API credit the whole time with no way for the
// UI to know something was wrong. Set at the client level so every call
// through this client is covered, not just the ones someone remembers
// to annotate. 480s (8 minutes) sits above the verified legitimate
// worst case observed for the heaviest call in the app (Research &
// Copy's research pass, ~191s), while still catching a genuine hang
// well before it reaches 10 minutes.
const CLAUDE_API_TIMEOUT_MS = 480_000;
const CLAUDE_API_TIMEOUT_MESSAGE = "This is taking longer than expected, try again?";

const client = new Anthropic({ timeout: CLAUDE_API_TIMEOUT_MS });

// Maps the SDK's timeout error to a message a user can actually act on,
// any other error (rate limit, billing, bad request) passes through
// with its real message intact rather than being masked.
async function withFriendlyTimeout<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (err) {
    if (err instanceof Anthropic.APIConnectionTimeoutError) {
      throw new Error(CLAUDE_API_TIMEOUT_MESSAGE);
    }
    throw err;
  }
}

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

  const message = await withFriendlyTimeout(
    client.messages.create({
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
    }),
  );

  const textBlock = message.content.find((b) => b.type === "text");
  const full = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";

  const verdictMatch = full.match(/Verdict:\s*(.+)$/im);
  return {
    findingsSummary: full.replace(/\n?Verdict:.+$/im, "").trim(),
    verdict: verdictMatch?.[1]?.trim() ?? "Unable to determine a verdict from the search results.",
  };
}

const ResearchCopySchema = z.object({
  summary: z.string(),
  globalSources: z.array(z.object({ title: z.string(), url: z.string() })).max(15),
  titles: z.array(z.string()).length(3),
  description: z.string(),
  keywordTags: z.array(z.string()).max(10),
  questionTags: z.array(z.string()).max(10),
  containers: z
    .array(
      z.object({
        type: z.enum(["discussion", "article"]),
        sourceName: z.string(),
        items: z.array(z.string()).max(8).nullable(),
        articleSummary: z.string().nullable(),
        sources: z.array(z.object({ title: z.string(), url: z.string() })).max(5),
      }),
    )
    .max(6),
});

// docs/topic-page-redesign.md Section 2, Tab 1 "Research & Copy": one
// Run, full depth from the start, no separate shallow-then-deep step.
// Two-call design, not one: step 1 lets Claude actually search the open
// web (whatever sources genuinely surface something useful, not fixed
// to a hardcoded set of APIs), producing a free-form dossier with
// inline source citations; step 2 extracts that dossier into the exact
// shape Tab 1 renders. Splitting it this way means step 2 is reformat-
// ting/extracting already-researched, already-cited material rather
// than researching and structuring in one pass, lower hallucination
// risk than asking a single call to do both under a rigid schema.
export async function synthesizeResearchAndCopy(params: {
  title: string;
  briefIntent: string | null;
  keywords: string | null;
}): Promise<ResearchCopyResult> {
  const researchStartedAt = Date.now();
  const researchResponse = await withFriendlyTimeout(
    client.messages.create({
    model: "claude-opus-5",
    // Verified live: at 8000 this hit stop_reason "max_tokens" and cut
    // the dossier off mid-generation (lost the entire ARTICLE SOURCES
    // section on an 8-search pull). Token budget isn't what was making
    // this slow, the 8 sequential real web searches were (~100s of the
    // ~160s total), so restoring headroom here doesn't meaningfully add
    // latency back, it just stops truncating real content.
    max_tokens: 16000,
    output_config: { effort: "medium" },
    // web_search_20260209's "dynamic filtering" auto-attaches a
    // code-execution environment that can re-invoke web_search itself
    // (a code_execution-caller search stacked on the model's own direct
    // search), and both count against max_uses, silently burning the
    // budget on roughly half as many real distinct queries as intended.
    // The 20250305 version doesn't auto-attach that environment, so
    // one query costs exactly one use.
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 8 }],
    system:
      "You are a thorough content researcher for a solo creator planning a video on the topic below. Search the web broadly, whatever sources genuinely surface something useful for this specific topic, forums, news, YouTube, communities, anything relevant, not a fixed checklist of sites. Every claim, statistic, or discussion point you use must trace back to something you actually found, never invent facts, numbers, or quotes. Cite sources inline as you go using the format [Title](URL) directly after the claim or paragraph it supports.",
    messages: [
      {
        role: "user",
        content: `Topic title: ${params.title}
Brief description: ${params.briefIntent || "(not provided)"}
Keywords: ${params.keywords || "(not provided)"}

Research this topic thoroughly and write up your findings as a structured dossier with these clearly labeled sections:

SUMMARY: a genuinely readable, clean prose overview of everything worth knowing about this topic for planning a video, roughly 1000+ words. Write like a knowledgeable person explaining it, not a listicle. Cite sources inline as [Title](URL).

SOURCES: a flat list of every source the summary drew from, one per line, as [Title](URL).

DISCUSSION SOURCES: for each forum/Reddit/Quora/community thread that surfaced genuinely useful pain points, questions, or suggestions, a labeled block: the source name (e.g. "Reddit", or the specific forum/community name), followed by each distinct pain point/question/suggestion found there as its own line, followed by the specific thread/comment URLs as [Title](URL) lines.

ARTICLE SOURCES: for each news article or blog post that's genuinely worth summarizing on its own, a labeled block: the source name/publication, a roughly 500-word summary of that specific piece in clean prose, followed by its URL as [Title](URL).

Only include a discussion or article source if it's genuinely useful for this specific topic, not generic filler to fill out a section, it's fine to have zero of either type if nothing surfaced.`,
      },
    ],
    }),
  );

  // Temporary diagnostic: real web_search invocation count straight
  // from the API's own usage accounting, and elapsed time for the
  // research call specifically. Not the dossier's actual content, just
  // hard numbers to confirm the double-invocation fix instead of
  // guessing from wall-clock feel.
  console.log(
    `[research-and-copy] research call: ${Date.now() - researchStartedAt}ms, web_search_requests=${researchResponse.usage.server_tool_use?.web_search_requests ?? "unknown"}, stop_reason=${researchResponse.stop_reason}`,
  );

  const dossier = researchResponse.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n\n");

  if (!dossier.trim()) {
    throw new Error("Research pass returned no content.");
  }

  const structureStartedAt = Date.now();
  const structureResponse = await withFriendlyTimeout(
    client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 12000,
      output_config: { effort: "low", format: zodOutputFormat(ResearchCopySchema) },
      system:
        "You extract and lightly reformat an already-researched dossier into a fixed structure, you do not add new research or invent anything not present in the dossier. Never use em dashes anywhere in any text field, write clean plain prose, avoid AI-formatted lists or AI-feeling phrasing in the summary and article summaries specifically, they should read like a person wrote them.",
      messages: [
        {
          role: "user",
          content: `Dossier:

${dossier}

Extract this into the target structure:
1. summary: the SUMMARY section verbatim in clean prose (rewrite only to remove em dashes or AI-feeling phrasing if present, keep the substance and length, roughly 1000+ words).
2. globalSources: every [Title](URL) from the SOURCES section.
3. titles: 3 distinct, compelling title options for this video based on the research.
4. description: one description under roughly 300 words covering the main points, not padded.
5. keywordTags and questionTags: derive from the research, keywordTags as short plain tags, questionTags phrased as real people search.
6. containers: one per DISCUSSION SOURCES or ARTICLE SOURCES block in the dossier. type "discussion" for discussion-style blocks (items = each pain point/question/suggestion as its own array entry, articleSummary = null), type "article" for article-style blocks (articleSummary = the ~500-word summary, items = null). sourceName = that block's source name. sources = that block's own [Title](URL) lines. Omit entirely if the dossier had none of that type.`,
        },
      ],
    }),
  );

  console.log(
    `[research-and-copy] structure call: ${Date.now() - structureStartedAt}ms, stop_reason=${structureResponse.stop_reason}`,
  );

  const parsed = structureResponse.parsed_output;
  if (!parsed) {
    throw new Error("Research & Copy synthesis did not return a parseable result.");
  }

  return { ...parsed, generatedAt: new Date().toISOString() };
}
