import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { WebSearchResult } from "@/lib/serpapi";
import type { ResearchCopyResult, ResearchStep, ScriptsResult, StepStatus } from "@/lib/types";
import { logDiagnostic } from "@/lib/diagnostic-log";

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

// Verified live 3 times now, with 3 different fixed budgets (8000, then
// 16000, then a scoped-down 8000 for a narrower piece): content length
// genuinely varies by topic, manually bumping a fixed max_tokens number
// each time a new topic exceeds it is chasing a moving target, not a
// fix. This self-heals instead: if a call gets cut off mid-generation
// (stop_reason "max_tokens"), retry it once with a meaningfully higher
// budget before giving up.
//
// Uses messages.create() directly rather than messages.parse(): parse()
// throws before ever handing back the response on a parse/validation
// failure (see node_modules/@anthropic-ai/sdk/src/lib/parser.ts,
// parseMessage throws inside its own .map() over the resolved message),
// which would hide stop_reason from us right when we need it most, and
// was exactly the gap that left a truncated-JSON failure with zero
// trace in the log earlier. Calling create() first means stop_reason is
// visible before any parsing is even attempted.
const MAX_TOKENS_RETRY_MULTIPLIER = 2;
const MAX_TOKENS_RETRY_CEILING = 32000;

async function createWithTruncationRetry(
  label: string,
  request: Anthropic.MessageCreateParamsNonStreaming,
): Promise<Anthropic.Message> {
  const first = await withFriendlyTimeout(client.messages.create(request));
  if (first.stop_reason !== "max_tokens") {
    return first;
  }

  const retryMaxTokens = Math.min(
    (request.max_tokens || 0) * MAX_TOKENS_RETRY_MULTIPLIER,
    MAX_TOKENS_RETRY_CEILING,
  );
  await logDiagnostic(
    `[research-and-copy] ${label}: hit max_tokens at budget=${request.max_tokens}, actual output_tokens=${first.usage.output_tokens}, retrying once at ${retryMaxTokens}`,
  );
  return withFriendlyTimeout(client.messages.create({ ...request, max_tokens: retryMaxTokens }));
}

// docs/topic-page-redesign.md Section 2 Tab 1 item 1: no markdown syntax
// of any kind in the summary (or article-style container summaries,
// which use "the same clean-prose rules"). The prompt instructions above
// are the actual fix, this is only a backstop for whatever slips through
// despite them, strips visible markdown syntax rather than trying to
// rewrite prose structure (can't turn a dangling-citation sentence back
// into a woven one with a regex, that has to come from generation).
// Logs when it actually had to change something, so a prompt regression
// stays visible instead of getting silently papered over.
async function stripMarkdownArtifacts(text: string, label: string): Promise<string> {
  const original = text.trim();
  const stripped = original
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/^>\s?/gm, "")
    .split("\n")
    .filter((line) => !/^\(?https?:\/\/\S+\)?$/.test(line.trim()))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (stripped !== original) {
    await logDiagnostic(
      `[research-and-copy] ${label}: markdown artifacts found in model output despite the prompt instruction, stripped as backstop`,
    );
  }
  return stripped;
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

// No .max() caps here on purpose. Verified live: the model returning
// more sources/containers than we want to *display* (a valid, complete
// response, just longer than intended) hit zod's array .max() and
// failed the whole call the exact same way real truncation does,
// "Too big: expected array to have <=6 items", a different bug wearing
// the same symptom. A schema cap turns "slightly more than expected"
// into a hard failure; slicing to the display limit after parsing (see
// synthesizeResearchAndCopy) achieves the same result without ever
// rejecting an otherwise-valid response.
const SourcesAndContainersSchema = z.object({
  globalSources: z.array(z.object({ title: z.string(), url: z.string() })),
  containers: z.array(
    z.object({
      type: z.enum(["discussion", "article"]),
      sourceName: z.string(),
      items: z.array(z.string()).nullable(),
      articleSummary: z.string().nullable(),
      sources: z.array(z.object({ title: z.string(), url: z.string() })),
    }),
  ),
});

const MAX_GLOBAL_SOURCES = 15;
const MAX_CONTAINERS = 6;
const MAX_CONTAINER_ITEMS = 8;
const MAX_CONTAINER_SOURCES = 5;

const CopyFieldsSchema = z.object({
  titles: z.array(z.string()).length(3),
  description: z.string(),
  keywordTags: z.array(z.string()).max(10),
  questionTags: z.array(z.string()).max(10),
});

type ResearchStepCallback = (step: ResearchStep, status: StepStatus) => Promise<void> | void;

// docs/topic-page-redesign.md Section 2, Tab 1 "Research & Copy": one
// Run, full depth from the start, no separate shallow-then-deep step.
//
// 3 calls, not 1 or 2. Verified live twice that a single fixed
// max_tokens budget for "write the whole dossier in one pass" doesn't
// survive every topic (8000 then 16000 both hit stop_reason
// "max_tokens" mid-generation on real topics, the second time producing
// a truncated dossier that broke the old structure call's JSON parsing
// entirely). Content length genuinely varies by topic, there's no safe
// fixed number for "everything in one call." Splitting into naturally-
// sized pieces means each piece's budget only has to cover that piece.
//
// Call 1 (summary) is the only one with the web_search tool and does
// the real searching, same "freeform text, not structured output"
// reasoning as before (rigid schema + live tool-calling together raises
// hallucination risk). Calls 2 and 3 are NOT given the tool at all, so
// it's structurally impossible for them to search again, not just an
// instruction the model could ignore. Call 2 reuses call 1's actual
// search results by replaying its full message history (tool_use/
// tool_result blocks included) as a prior turn, so it can pull discussion
// pain points and article summaries straight from the raw findings, not
// just what made it into the polished summary prose. Call 3 only needs
// the finished summary text, not the raw search transcript.
export async function synthesizeResearchAndCopy(params: {
  title: string;
  briefIntent: string | null;
  keywords: string | null;
  onStep?: ResearchStepCallback;
}): Promise<ResearchCopyResult> {
  const topicContext = `Topic title: ${params.title}
Brief description: ${params.briefIntent || "(not provided)"}
Keywords: ${params.keywords || "(not provided)"}`;

  await params.onStep?.("summary", "running");

  const summaryUserContent = `${topicContext}

Research this topic thoroughly, searching broadly, whatever sources genuinely surface something useful for this specific topic: forums, Reddit, Quora, news, YouTube, communities, anything relevant, not a fixed checklist of sites. This same research gets reused by a follow-up pass that pulls out discussion pain points and article summaries from what you find, so search broadly enough to cover those too, not only what this summary itself ends up citing.

Then write the SUMMARY: a genuinely readable, clean prose overview of everything worth knowing about this topic for planning a video, roughly 1000+ words. Write like a knowledgeable person explaining it, not a listicle, not a structured research report. Weave every citation naturally into the sentence itself, the way a person telling you about something they read would, for example "a 2025 Lancet review found the benefit levels off around 7,000 steps" or "UCLA Health reports...". Never cite as a bracketed [Title](URL) link, never as a quote broken out on its own line followed by a dangling source URL, and never use markdown syntax anywhere in this summary: no # or ## or ### headers, no **bold**, no bullet lists. Continuous prose start to finish, nothing structural. Open directly with the first real substantive point, never with a line narrating what you're about to do, for example never start with something like "I'll research this thoroughly across multiple angles" or "Let's look at this topic", the reader should be reading actual content from the very first sentence.`;

  const summaryStartedAt = Date.now();
  const summaryResponse = await createWithTruncationRetry("summary call", {
    model: "claude-opus-5",
    // Scoped to just the summary now (not summary+sources+discussion+
    // article all at once), so this budget only has to cover a
    // ~1000+ word prose piece, not four sections combined. If a topic
    // still exceeds this, createWithTruncationRetry retries once at 2x
    // rather than failing, no manual number-chasing needed.
    max_tokens: 8000,
    output_config: { effort: "medium" },
    // web_search_20260209's "dynamic filtering" auto-attaches a
    // code-execution environment that can re-invoke web_search itself
    // (a code_execution-caller search stacked on the model's own direct
    // search), and both count against max_uses, silently burning the
    // budget on roughly half as many real distinct queries as intended.
    // The 20250305 version doesn't auto-attach that environment, so
    // one query costs exactly one use.
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 8 }],
    // docs/topic-page-redesign.md Section 2 Tab 1 item 1: the summary
    // requirement is explicit now, no markdown syntax of any kind, no
    // headers, no bracketed links, no isolated quote-plus-dangling-link
    // blocks, citations woven into the sentence itself. Verified live:
    // the model defaults to exactly that structured-report shape
    // (### headers, [Title](url) links) unless told not to, this
    // instruction is the actual fix, stripMarkdownArtifacts below is
    // only a backstop for whatever slips through. Also verified live: it
    // defaults to opening with a line narrating its own process ("I'll
    // research this thoroughly across multiple angles") before the real
    // content starts, same category of problem, told not to here too.
    system:
      "You are a thorough content researcher for a solo creator planning a video on the topic below. Every claim, statistic, or discussion point you use must trace back to something you actually found, never invent facts, numbers, or quotes. Never use em dashes anywhere. Write clean, continuous prose a person would actually enjoy reading, the way someone knowledgeable would explain it out loud, never a structured research report. No markdown syntax anywhere: no headers, no bold, no bracketed [text](url) links, no blockquote-style isolated quotes with a citation floating alone on its own line. Every citation gets woven directly into the sentence it supports, e.g. \"a 2025 Lancet review found...\" or \"...according to UCLA Health\", never broken out as a separate fragment with a dangling source URL after it. Open directly with real substantive content, never with a line narrating what you're about to do (e.g. never \"I'll research this thoroughly\" or \"Let's look at this\"), the first sentence should already be teaching the reader something.",
    messages: [{ role: "user", content: summaryUserContent }],
  });

  await logDiagnostic(
    `[research-and-copy] summary call: ${Date.now() - summaryStartedAt}ms, web_search_requests=${summaryResponse.usage.server_tool_use?.web_search_requests ?? "unknown"}, stop_reason=${summaryResponse.stop_reason}, output_tokens=${summaryResponse.usage.output_tokens}`,
  );

  const rawSummary = summaryResponse.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n\n")
    .trim();

  if (!rawSummary) {
    await params.onStep?.("summary", "error");
    throw new Error("Research pass returned no content.");
  }
  const summary = await stripMarkdownArtifacts(rawSummary, "summary");
  await params.onStep?.("summary", "done");

  await params.onStep?.("sources", "running");

  const sourcesFormat = zodOutputFormat(SourcesAndContainersSchema);
  const sourcesStartedAt = Date.now();
  const sourcesResponse = await createWithTruncationRetry("sources call", {
    model: "claude-opus-5",
    max_tokens: 16000,
    output_config: { effort: "low", format: sourcesFormat },
    // docs/topic-page-redesign.md Section 2 Tab 1 item 6: article-style
    // containers use "the same clean-prose rules as the main summary",
    // so articleSummary gets the identical no-markdown, woven-citation
    // instruction as the summary call above, not a looser version of it.
    system:
      "You extract structured findings from an already-completed research pass, you do not add new research, invent anything not present in it, or search again. Never use em dashes anywhere in any text field. For articleSummary specifically: clean, continuous prose, no markdown syntax of any kind (no headers, no bold, no bracketed [text](url) links, no isolated quote-plus-dangling-link blocks), every citation woven naturally into the sentence itself, exactly the same rules as the main research summary.",
    // Replays call 1's own turn (including its web_search tool_use/
    // tool_result blocks) so this call can read the raw findings, not
    // just the finished summary text, no tools attached here means it
    // structurally cannot search again.
    messages: [
      { role: "user", content: summaryUserContent },
      { role: "assistant", content: summaryResponse.content },
      {
        role: "user",
        content: `From the research above, do not search again, extract:

1. globalSources: every source the summary drew from, as {title, url} pairs, focus on the roughly 15 most important if there are more.
2. containers: one per genuinely useful discussion (forum/Reddit/Quora/community thread) or article (news/blog post) source found in the research above, whether or not it made it into the summary's citations. type "discussion" for discussion-style blocks (items = each distinct pain point/question/suggestion found there as its own array entry, articleSummary = null), type "article" for article-style blocks (articleSummary = a roughly 500-word summary of that specific piece in clean prose, items = null). sourceName = that source's name (e.g. "Reddit", or the specific forum/publication). sources = that source's own thread/comment/article URLs as {title, url} pairs, focus on the 5 best if there are more. Only include a container if it's genuinely useful for this specific topic, not filler, it's fine to have zero of either type if nothing surfaced, and focus on the 6 most genuinely useful if more surfaced.`,
      },
    ],
  });

  await logDiagnostic(
    `[research-and-copy] sources call: ${Date.now() - sourcesStartedAt}ms, stop_reason=${sourcesResponse.stop_reason}, output_tokens=${sourcesResponse.usage.output_tokens}`,
  );

  let sourcesParsed: z.infer<typeof SourcesAndContainersSchema>;
  try {
    const sourcesText = sourcesResponse.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    sourcesParsed = sourcesFormat.parse(sourcesText);
  } catch (err) {
    // Called manually (not via messages.parse()) specifically so the
    // stop_reason log line above always lands first, whatever happens
    // here. Verified live: a parse/validation failure here previously
    // left zero trace in the log, no elapsed time, no error, nothing to
    // check afterward.
    await logDiagnostic(
      `[research-and-copy] sources call: parsing FAILED: ${err instanceof Error ? err.message : String(err)}`,
    );
    await params.onStep?.("sources", "error");
    throw err;
  }
  await params.onStep?.("sources", "done");

  // Enforced here, not as a schema .max() (see SourcesAndContainersSchema
  // comment): a response that's valid but longer than we want to display
  // gets trimmed, not rejected outright.
  const globalSources = sourcesParsed.globalSources.slice(0, MAX_GLOBAL_SOURCES);
  const containers = await Promise.all(
    sourcesParsed.containers.slice(0, MAX_CONTAINERS).map(async (c) => ({
      ...c,
      items: c.items ? c.items.slice(0, MAX_CONTAINER_ITEMS) : null,
      sources: c.sources.slice(0, MAX_CONTAINER_SOURCES),
      // Article-style containers use the same clean-prose, no-markdown
      // rules as the main summary (docs/topic-page-redesign.md Section 2
      // Tab 1 item 6), same backstop applies.
      articleSummary: c.articleSummary
        ? await stripMarkdownArtifacts(c.articleSummary, `sources call container "${c.sourceName}"`)
        : c.articleSummary,
    })),
  );

  await params.onStep?.("copy", "running");

  const painPoints = containers
    .filter((c) => c.type === "discussion" && c.items && c.items.length > 0)
    .flatMap((c) => c.items!.map((item) => `- (${c.sourceName}) ${item}`))
    .join("\n");

  const copyFormat = zodOutputFormat(CopyFieldsSchema);
  const copyStartedAt = Date.now();
  const copyResponse = await createWithTruncationRetry("copy call", {
    model: "claude-opus-5",
    max_tokens: 3000,
    output_config: { effort: "low", format: copyFormat },
    system:
      "You extract titles, a description, and tags from an already-completed research summary, you do not add new research or invent facts not present in it. Never use em dashes anywhere in any text field.",
    messages: [
      {
        role: "user",
        content: `${topicContext}

Research summary:
${summary}

${painPoints ? `Discussion pain points/questions found during research:\n${painPoints}\n\n` : ""}Produce:
1. titles: 3 distinct, compelling title options for this video based on the research.
2. description: one description under roughly 300 words covering the main points, not padded.
3. keywordTags and questionTags: derive from the research, keywordTags as short plain tags, questionTags phrased as real people search.`,
      },
    ],
  });

  await logDiagnostic(
    `[research-and-copy] copy call: ${Date.now() - copyStartedAt}ms, stop_reason=${copyResponse.stop_reason}, output_tokens=${copyResponse.usage.output_tokens}`,
  );

  let copyParsed: z.infer<typeof CopyFieldsSchema>;
  try {
    const copyText = copyResponse.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    copyParsed = copyFormat.parse(copyText);
  } catch (err) {
    await logDiagnostic(
      `[research-and-copy] copy call: parsing FAILED: ${err instanceof Error ? err.message : String(err)}`,
    );
    await params.onStep?.("copy", "error");
    throw err;
  }
  await params.onStep?.("copy", "done");

  return {
    summary,
    globalSources,
    containers,
    ...copyParsed,
    generatedAt: new Date().toISOString(),
  };
}

const ScriptPointerSchema = z.object({
  point: z.string(),
  explanation: z.string(),
});

const AtomizedShortSchema = z.object({
  title: z.string(),
  // No .max() here either (see SourcesAndContainersSchema's comment,
  // same reasoning): a genuinely rich topic could support more pointer
  // points per short than a fixed cap allows, trimmed to
  // MAX_POINTS_PER_SCRIPT after parsing instead of rejecting a longer-
  // than-expected valid response outright.
  pointerScript: z.array(ScriptPointerSchema).min(1),
});

// Same reasoning again for the top-level arrays: no .max() on
// atomizedShorts, shortFormPointers, or ctaOptions, trimmed after
// parsing.
const ScriptsSchema = z.object({
  hooks: z.array(z.string()).length(3),
  painPointAnswer: z.string(),
  longFormScript: z.string(),
  ctaOptions: z.array(z.string()).min(2),
  shortFormPointers: z.array(ScriptPointerSchema).min(1),
  atomizedShorts: z.array(AtomizedShortSchema).min(1),
});
const MAX_ATOMIZED_SHORTS = 8;
const MAX_POINTS_PER_SCRIPT = 8;
const MAX_CTAS = 4;

// docs/topic-page-redesign.md Section 2, Tab 2 "Scripts": drawn from
// Tab 1's already-completed research, not a fresh research pass of its
// own, so this is one structured-output call, not the two-call
// research+extract split synthesizeResearchAndCopy uses. Pain points and
// questions from the discussion containers are surfaced explicitly so
// the script's main points target what real people were actually asking
// or struggling with, not the topic in the abstract (the spec's "viewer
// feeling like this is exactly what they were searching for").
//
// One Run always produces the full package below, not a branch on the
// item's own format field, hooks + painPointAnswer open the long-form
// script specifically (the answer/relief line lands right after
// whichever hook gets used), longFormScript is the main body,
// shortFormPointers condenses that same core topic into a single
// pointer-style pass, and atomizedShorts breaks the long-form content
// into however many genuinely standalone shorts it actually supports.
export async function synthesizeScripts(params: {
  title: string;
  briefIntent: string | null;
  keywords: string | null;
  researchCopy: ResearchCopyResult;
}): Promise<ScriptsResult> {
  const painPointsAndQuestions = params.researchCopy.containers
    .filter((c) => c.type === "discussion" && c.items && c.items.length > 0)
    .flatMap((c) => c.items!.map((item) => `- (${c.sourceName}) ${item}`))
    .concat(params.researchCopy.questionTags.map((q) => `- (search question) ${q}`))
    .join("\n");

  const scriptsFormat = zodOutputFormat(ScriptsSchema);
  const startedAt = Date.now();
  const response = await createWithTruncationRetry("scripts call", {
    model: "claude-opus-5",
    // Bumped from the old single-script-shape's 12000: this call now
    // produces a long-form script plus a full pointer-style pass plus
    // however many atomized shorts the topic supports, genuinely more
    // content than before, not a guess-and-hope number. Automatic
    // retry-at-2x (createWithTruncationRetry) still covers whatever
    // topic exceeds even this.
    max_tokens: 16000,
    output_config: { effort: "medium", format: scriptsFormat },
    system:
      "You write video scripts and script outlines for a solo creator's channel, grounded strictly in already-completed research provided to you, you do not invent facts, statistics, or claims not present in that research. Write natural, spoken, direct-address language a person would actually say on camera in longFormScript, painPointAnswer, and ctaOptions specifically, never AI-formatted lists or stiff phrasing there. Pointer-style sections (shortFormPointers, and each atomized short's pointerScript) are outlines to glance at while recording, not scripts to read verbatim, short phrases plus a brief explanation each, not full sentences of spoken dialogue, no CTA needed in those, that's just one more point to ad-lib when you get there. Never use em dashes anywhere.",
    messages: [
      {
        role: "user",
        content: `Topic title: ${params.title}
Brief description: ${params.briefIntent || "(not provided)"}
Keywords: ${params.keywords || "(not provided)"}

Research summary:
${params.researchCopy.summary}

Recurring pain points and questions from the research, the script's main points should specifically address these rather than covering the topic in the abstract:
${painPointsAndQuestions || "(none surfaced, work from the research summary above)"}

Produce all of the following:

1. hooks: exactly 3 distinct opening hook line options, the first line or two that would stop someone scrolling, specific to this topic's actual content, not generic teasers.

2. painPointAnswer: one direct line delivering the core answer or relief the viewer came for, meant to land immediately after whichever hook gets used. Placed early on purpose, don't bury it after buildup, the viewer should get the actual payoff before anything else, not just a promise of one.

3. longFormScript: the main long-form script, natural spoken language, direct address ("you"), specifically addressing the pain points/questions above, picking up the explanation and depth after the hook and pain-point answer rather than repeating them.

4. ctaOptions: 2 to 4 short call-to-action line options for the end of the long-form script specifically, genuinely fitting this content, not generic filler. This is the one piece in the whole package that's a complete, read-it-as-written script, that's why it gets its own CTA and the pointer-style pieces below don't.

5. shortFormPointers: a condensed short-form pass of this same core topic, not a different topic, as a pointer-style outline, each entry one main point plus a brief explanation, short phrases, not full prose or word-for-word lines. This is what you'd glance at to record a single short covering the whole idea compactly.

6. atomizedShorts: look at the long-form script's actual content and identify how many genuinely standalone shorts it could be split into, each one independently valuable on its own, a viewer gets a complete payoff from that one short alone, not a fragment that only makes sense with the rest of the long-form piece. Do not pad to a fixed count, as many as the material genuinely supports, it's fine to have just one or two if that's honestly all it supports. For each one, give a title (what makes it its own standalone piece) and a small pointerScript in the same point-plus-explanation style as item 5, scoped to just that short's slice of the content.`,
      },
    ],
  });

  await logDiagnostic(
    `[research-and-copy] scripts call: ${Date.now() - startedAt}ms, stop_reason=${response.stop_reason}, output_tokens=${response.usage.output_tokens}`,
  );

  let parsed: z.infer<typeof ScriptsSchema>;
  try {
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    parsed = scriptsFormat.parse(text);
  } catch (err) {
    await logDiagnostic(
      `[research-and-copy] scripts call: parsing FAILED: ${err instanceof Error ? err.message : String(err)}`,
    );
    throw err;
  }

  // Enforced here, not as a schema .max() (see ScriptsSchema's comment):
  // a response that's valid but longer than we want to display gets
  // trimmed, not rejected outright.
  return {
    hooks: parsed.hooks,
    painPointAnswer: parsed.painPointAnswer,
    longFormScript: parsed.longFormScript,
    ctaOptions: parsed.ctaOptions.slice(0, MAX_CTAS),
    shortFormPointers: parsed.shortFormPointers.slice(0, MAX_POINTS_PER_SCRIPT),
    atomizedShorts: parsed.atomizedShorts.slice(0, MAX_ATOMIZED_SHORTS).map((s) => ({
      ...s,
      pointerScript: s.pointerScript.slice(0, MAX_POINTS_PER_SCRIPT),
    })),
    generatedAt: new Date().toISOString(),
  };
}
