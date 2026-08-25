import type { ManualWorkflowStatus } from "@/lib/types";

// "Paste from AI chat" for the Manual workflow's three phases (Research,
// Packaging, Scripting - docs/manual-workflow-redesign.md,
// docs/research-packaging-scripting-template.txt). Same free,
// pattern-based, no-Claude-call philosophy as src/lib/paste-import.ts,
// deliberately kept as its own self-contained module rather than
// extended into that file: these are much larger, differently-shaped
// templates against a completely separate table (manual_workflow_phases,
// not research_copy_versions/scripts_versions), no reason to couple this
// parser's header sets to that older, unrelated system's. All three
// phases share this one module (not one file each) since they DO
// genuinely share low-level helpers (splitSections, joinBlock, listLines,
// labeled, labeledScore, splitBlocks below) and belong to the same
// workflow, unlike the old system this deliberately isn't coupled to.
//
// Same anti-fabrication stance as the rest of this app (CLAUDE.md
// Section 16, and this template's own [VERIFY]/[PERSONAL INPUT NEEDED]/
// [EXAMPLE NEEDED] markers): this module never invents a value for a
// missing field, an absent header just means that field comes back
// empty, only a missing CORE header rejects the whole paste back to the
// raw-text fallback (docs/manual-workflow-redesign.md's Fallback
// behavior section).

export type ContentOpportunityScores = {
  relevance: number;
  evidence: number;
  novelty: number;
  evergreen: number;
  visualPotential: number;
};

export type ContentOpportunity = {
  name: string;
  viewerProblem: string;
  viewerDesire: string;
  unansweredQuestion: string;
  whatCompetitorsMissed: string;
  evidenceSupporting: string;
  missingExample: string;
  missingDemonstration: string;
  whyItProvidesValue: string;
  riskOfBecomingGeneric: string;
  scores: ContentOpportunityScores;
};

export type ResearchSourceClaim = {
  sourceTitle: string;
  url: string;
  publicationDate: string;
  claimSupported: string;
  // Free text on purpose: the template asks for "Confidence level"
  // without fixing its own vocabulary, high/medium/low is the common
  // case (and the one the visible tag styling below reads) but a
  // pasted response using different words still keeps its own text
  // rather than getting silently coerced or dropped.
  confidence: "high" | "medium" | "low" | string;
};

export type ResearchPhaseData = {
  topicDefinition: string;
  primaryPillarAndSubtopic: string;
  mainAudienceProblem: string;
  audienceDesire: string;
  audienceConfusion: string;
  currentDevelopments: string;
  importantFindings: string;
  directCompetitorContent: string;
  relatedContent: string;
  competitorStrengths: string;
  competitorWeaknesses: string;
  whatCompetitorsMissed: string;
  frequentlyAskedQuestions: string[];
  unansweredQuestions: string[];
  viewerPainPoints: string[];
  viewerObjections: string[];
  viewerMisunderstandings: string[];
  viewerRequests: string[];
  viewerSuggestions: string[];
  contentGapAnalysis: string;
  contentOpportunities: ContentOpportunity[];
  recommendedOpportunity: string;
  viewerTransformationOrDesiredOutcome: string;
  sources: ResearchSourceClaim[];
  researchLimitations: string;
  // Raw text of the field (may include reasoning beyond the one status
  // word); the actual APPROVED/NEEDS REVISION/REJECTED classification
  // is pulled out of this separately by extractApprovalStatus below,
  // since manual_workflow_phases.status is its own typed column, not
  // buried inside parsed_data.
  researchQualityStatusText: string;
};

export const RESEARCH_PHASE_PASTE_TEMPLATE_HINT = `Expects these headers, each on its own line (case-insensitive, optional
leading #/##/### or number, optional trailing colon), matching
docs/research-packaging-scripting-template.txt Phase 1's Research Output
list: Topic Definition / Primary Pillar and Subtopic / Main Audience
Problem / Audience Desire / Audience Confusion / Current Developments /
Important Findings / Direct Competitor Content / Related Content /
Competitor Strengths / Competitor Weaknesses / What Competitors Missed /
Frequently Asked Questions / Unanswered Questions / Viewer Pain Points /
Viewer Objections / Viewer Misunderstandings / Viewer Requests / Viewer
Suggestions / Content Gap Analysis / Five Content Opportunities /
Recommended Opportunity / Viewer Transformation or Desired Outcome /
Sources / Research Limitations / Research Quality Status.
Under Five Content Opportunities, each one starts its own "Opportunity N: <name>"
line, followed by "Label: value" lines for Viewer problem, Viewer desire,
Unanswered question, What competitors missed, Evidence supporting the
opportunity, Missing example, Missing demonstration, Why it provides
value, Risk of becoming generic, and the five 0-10 scores as e.g.
"Relevance score: 8".
Under Sources, each claim starts its own "Source title: <title>" line,
followed by "Label: value" lines for Direct URL, Publication or update
date, Claim supported, Confidence level.`;

function buildHeaderRegex(headers: readonly string[]): RegExp {
  const alternation = headers.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return new RegExp(`^#{0,3}\\s*(?:\\d+[.)]\\s*)?(${alternation})\\s*:?\\s*$`, "i");
}

function splitSections(text: string, headers: readonly string[]): Map<string, string[]> {
  const headerRe = buildHeaderRegex(headers);
  const sections = new Map<string, string[]>();
  let current: string | null = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    const match = line.trim().match(headerRe);
    if (match) {
      current = headers.find((h) => h.toLowerCase() === match[1].toLowerCase()) ?? match[1].toUpperCase();
      sections.set(current, []);
      continue;
    }
    if (current) sections.get(current)!.push(line);
  }
  return sections;
}

function joinBlock(lines: string[] | undefined): string {
  return (lines ?? []).join("\n").trim();
}

function listLines(lines: string[] | undefined): string[] {
  return (lines ?? [])
    .map((l) => l.trim().replace(/^[-*]\s+|^\d+[.)]\s+/, "").trim())
    .filter((l) => l.length > 0);
}

// Scans a block's lines for the first one matching "<label>: value"
// (any of the given label spellings, tried in order), tolerant of a
// leading bullet marker. Used for both opportunity and source sub-fields,
// each of which the template asks for as one labeled attribute per line.
function labeled(lines: string[], ...labels: string[]): string | null {
  for (const label of labels) {
    const re = new RegExp(`^\\s*(?:[-*]\\s*)?${label}\\s*:?\\s*(.+)$`, "i");
    for (const line of lines) {
      const match = line.match(re);
      if (match) return match[1].trim();
    }
  }
  return null;
}

function labeledScore(lines: string[], ...labels: string[]): number {
  const raw = labeled(lines, ...labels);
  if (raw == null) return 0;
  const match = raw.match(/(\d{1,2})/);
  if (!match) return 0;
  return Math.max(0, Math.min(10, Number(match[1])));
}

function splitBlocks(lines: string[] | undefined, startRe: RegExp): string[][] {
  const blocks: string[][] = [];
  let current: string[] | null = null;
  for (const raw of lines ?? []) {
    if (startRe.test(raw.trim())) {
      if (current) blocks.push(current);
      current = [raw];
      continue;
    }
    if (current) current.push(raw);
  }
  if (current) blocks.push(current);
  return blocks;
}

const OPPORTUNITY_START_RE =
  /^(?:#{1,3}\s*)?(?:Opportunity\s*\d*\s*[:.\-]\s*(.+)|(\d+)[.)]\s+(.+))$/i;

function parseContentOpportunities(lines: string[] | undefined): ContentOpportunity[] {
  const blocks = splitBlocks(lines, OPPORTUNITY_START_RE);
  return blocks.map((block) => {
    const startMatch = block[0].trim().match(OPPORTUNITY_START_RE);
    const name = (startMatch?.[1] ?? startMatch?.[3] ?? "Untitled opportunity").trim();
    return {
      name,
      viewerProblem: labeled(block, "Viewer problem") ?? "",
      viewerDesire: labeled(block, "Viewer desire") ?? "",
      unansweredQuestion: labeled(block, "Unanswered question") ?? "",
      whatCompetitorsMissed: labeled(block, "What competitors missed") ?? "",
      evidenceSupporting: labeled(block, "Evidence supporting the opportunity", "Evidence") ?? "",
      missingExample: labeled(block, "Missing example") ?? "",
      missingDemonstration: labeled(block, "Missing demonstration") ?? "",
      whyItProvidesValue: labeled(block, "Why it provides value") ?? "",
      riskOfBecomingGeneric: labeled(block, "Risk of becoming generic") ?? "",
      scores: {
        relevance: labeledScore(block, "Relevance score", "Relevance"),
        evidence: labeledScore(block, "Evidence score"),
        novelty: labeledScore(block, "Novelty score", "Novelty"),
        evergreen: labeledScore(block, "Evergreen value score", "Evergreen score", "Evergreen"),
        visualPotential: labeledScore(block, "Visual potential score", "Visual potential"),
      },
    };
  });
}

const SOURCE_START_RE = /^(?:[-*]\s*)?(?:\d+[.)]\s*)?Source title\s*:?\s*.+$/i;

function normalizeConfidence(raw: string): ResearchSourceClaim["confidence"] {
  if (/high/i.test(raw)) return "high";
  if (/medium|moderate/i.test(raw)) return "medium";
  if (/low/i.test(raw)) return "low";
  return raw || "unspecified";
}

function parseResearchSources(lines: string[] | undefined): ResearchSourceClaim[] {
  const blocks = splitBlocks(lines, SOURCE_START_RE);
  return blocks.map((block) => {
    let url = labeled(block, "Direct URL", "URL") ?? "";
    if (!url) {
      const urlLine = block.find((l) => /https?:\/\//.test(l));
      url = urlLine?.match(/https?:\/\/\S+/)?.[0] ?? "";
    }
    return {
      sourceTitle: labeled(block, "Source title") ?? "Untitled source",
      url,
      publicationDate: labeled(block, "Publication or update date", "Publication date", "Update date") ?? "",
      claimSupported: labeled(block, "Claim supported", "Claim") ?? "",
      confidence: normalizeConfidence((labeled(block, "Confidence level", "Confidence") ?? "").trim()),
    };
  });
}

// Confidence gate, same principle as paste-import.ts's own CORE_HEADERS
// constants: these five are spread across the whole document (opening,
// middle, and closing fields), present together is a strong signal this
// is genuinely a Research-phase paste rather than something else, while
// every other field stays optional, its own absence just leaves that
// one field empty rather than rejecting the entire paste.
const RESEARCH_PHASE_CORE_HEADERS = [
  "TOPIC DEFINITION",
  "MAIN AUDIENCE PROBLEM",
  "CONTENT GAP ANALYSIS",
  "RECOMMENDED OPPORTUNITY",
  "RESEARCH QUALITY STATUS",
] as const;

const RESEARCH_PHASE_HEADERS = [
  "TOPIC DEFINITION",
  "PRIMARY PILLAR AND SUBTOPIC",
  "MAIN AUDIENCE PROBLEM",
  "AUDIENCE DESIRE",
  "AUDIENCE CONFUSION",
  "CURRENT DEVELOPMENTS",
  "IMPORTANT FINDINGS",
  "DIRECT COMPETITOR CONTENT",
  "RELATED CONTENT",
  "COMPETITOR STRENGTHS",
  "COMPETITOR WEAKNESSES",
  "WHAT COMPETITORS MISSED",
  "FREQUENTLY ASKED QUESTIONS",
  "UNANSWERED QUESTIONS",
  "VIEWER PAIN POINTS",
  "VIEWER OBJECTIONS",
  "VIEWER MISUNDERSTANDINGS",
  "VIEWER REQUESTS",
  "VIEWER SUGGESTIONS",
  "CONTENT GAP ANALYSIS",
  "FIVE CONTENT OPPORTUNITIES",
  "RECOMMENDED OPPORTUNITY",
  "VIEWER TRANSFORMATION OR DESIRED OUTCOME",
  "SOURCES",
  "RESEARCH LIMITATIONS",
  "RESEARCH QUALITY STATUS",
] as const;

export function parseResearchPhasePaste(text: string): ResearchPhaseData | null {
  const sections = splitSections(text, RESEARCH_PHASE_HEADERS);
  if (!RESEARCH_PHASE_CORE_HEADERS.every((h) => sections.has(h))) return null;

  const topicDefinition = joinBlock(sections.get("TOPIC DEFINITION"));
  const mainAudienceProblem = joinBlock(sections.get("MAIN AUDIENCE PROBLEM"));
  const contentGapAnalysis = joinBlock(sections.get("CONTENT GAP ANALYSIS"));
  const recommendedOpportunity = joinBlock(sections.get("RECOMMENDED OPPORTUNITY"));
  const researchQualityStatusText = joinBlock(sections.get("RESEARCH QUALITY STATUS"));
  if (
    !topicDefinition ||
    !mainAudienceProblem ||
    !contentGapAnalysis ||
    !recommendedOpportunity ||
    !researchQualityStatusText
  ) {
    return null;
  }

  return {
    topicDefinition,
    primaryPillarAndSubtopic: joinBlock(sections.get("PRIMARY PILLAR AND SUBTOPIC")),
    mainAudienceProblem,
    audienceDesire: joinBlock(sections.get("AUDIENCE DESIRE")),
    audienceConfusion: joinBlock(sections.get("AUDIENCE CONFUSION")),
    currentDevelopments: joinBlock(sections.get("CURRENT DEVELOPMENTS")),
    importantFindings: joinBlock(sections.get("IMPORTANT FINDINGS")),
    directCompetitorContent: joinBlock(sections.get("DIRECT COMPETITOR CONTENT")),
    relatedContent: joinBlock(sections.get("RELATED CONTENT")),
    competitorStrengths: joinBlock(sections.get("COMPETITOR STRENGTHS")),
    competitorWeaknesses: joinBlock(sections.get("COMPETITOR WEAKNESSES")),
    whatCompetitorsMissed: joinBlock(sections.get("WHAT COMPETITORS MISSED")),
    frequentlyAskedQuestions: listLines(sections.get("FREQUENTLY ASKED QUESTIONS")),
    unansweredQuestions: listLines(sections.get("UNANSWERED QUESTIONS")),
    viewerPainPoints: listLines(sections.get("VIEWER PAIN POINTS")),
    viewerObjections: listLines(sections.get("VIEWER OBJECTIONS")),
    viewerMisunderstandings: listLines(sections.get("VIEWER MISUNDERSTANDINGS")),
    viewerRequests: listLines(sections.get("VIEWER REQUESTS")),
    viewerSuggestions: listLines(sections.get("VIEWER SUGGESTIONS")),
    contentGapAnalysis,
    contentOpportunities: parseContentOpportunities(sections.get("FIVE CONTENT OPPORTUNITIES")),
    recommendedOpportunity,
    viewerTransformationOrDesiredOutcome: joinBlock(sections.get("VIEWER TRANSFORMATION OR DESIRED OUTCOME")),
    sources: parseResearchSources(sections.get("SOURCES")),
    researchLimitations: joinBlock(sections.get("RESEARCH LIMITATIONS")),
    researchQualityStatusText,
  };
}

// manual_workflow_phases.status is a typed enum column, separate from
// parsed_data, this pulls the template's own end-of-phase line (APPROVED
// / NEEDS REVISION / REJECTED) out of the Research Quality Status text
// into that column. null (not a guess like "approved") when the text
// doesn't contain any of the three words, e.g. a low-confidence status
// paragraph that never actually states one.
export function extractApprovalStatus(statusText: string): ManualWorkflowStatus | null {
  const upper = statusText.toUpperCase();
  if (/\bNEEDS REVISION\b/.test(upper)) return "needs_revision";
  if (/\bAPPROVED\b/.test(upper)) return "approved";
  if (/\bREJECTED\b/.test(upper)) return "rejected";
  return null;
}

// ---------------------------------------------------------------------
// Packaging phase (docs/research-packaging-scripting-template.txt Phase 2)
// ---------------------------------------------------------------------

export type PackagingTitleOption = {
  title: string;
  researchSupport: string;
  viewerProblemAddressed: string;
  promiseMade: string;
  reasonToClick: string;
  riskOfMisleading: string;
};

export type ThumbnailSuggestion = {
  concept: string;
  mainVisual: string;
  subjectActionOrExpression: string;
  thumbnailText: string;
  colorDirection: string;
  emotionalTrigger: string;
  whyItFits: string;
  whatToAvoid: string;
};

export type CarouselEvaluation = {
  recommendation: string;
  suitabilityScore: number;
  reason: string;
  recommendedSlideCount: string;
  bestCarouselAngle: string;
  bestPlatform: string;
  titleOptions: string[];
  designDirection: string;
  colorDirection: string;
  finalSlideCta: string;
  viewerTakeaway: string;
};

export type PackagingPhaseData = {
  titles: PackagingTitleOption[];
  // The template's own numbered list of 7 platforms, in that order.
  // A plain record (not one field per platform) so the display side can
  // iterate PLATFORM_COPY_LABELS without a 7-way switch.
  platformCopy: Record<
    | "youtubeDescription"
    | "shortFormCaption"
    | "instagramCaption"
    | "tiktokCaption"
    | "youtubeShortsCaption"
    | "xCaption"
    | "threadsCaption",
    string
  >;
  shortKeywords: string[];
  searchPhrases: string[];
  thumbnails: ThumbnailSuggestion[];
  visualHooks: string[];
  textualHooks: string[];
  verbalHooks: string[];
  carousel: CarouselEvaluation;
  ctaOptions: {
    engagement: string;
    saveShare: string;
    followSubscribeResourceConversion: string;
  };
  recommendations: {
    strongestTitle: string;
    strongestVisualHook: string;
    strongestTextualHook: string;
    strongestVerbalHook: string;
    strongestThumbnail: string;
    strongestCta: string;
  };
};

export const PACKAGING_PASTE_TEMPLATE_HINT = `Expects these headers, each on its own line (case-insensitive, optional
leading #/##/### or number, optional trailing colon), matching
docs/research-packaging-scripting-template.txt Phase 2: Titles / YouTube
Description / Short-Form Caption / Instagram Caption / TikTok Caption /
YouTube Shorts Caption / X Caption / Threads Caption / Short Keywords /
Search Phrases / Thumbnails / Visual Hooks / Textual Hooks / Verbal
Hooks / Carousel Evaluation / CTA Options / Recommendations.
Under Titles, each option starts its own "Title N: <title>" line, then
"Label: value" lines for Research support, Viewer problem addressed,
Promise made, Reason to click, Risk of misleading.
Under Thumbnails, each suggestion starts its own "Thumbnail N: <short name>"
line, then "Label: value" lines for Main visual, Subject action or
expression, Thumbnail text, Color direction, Emotional trigger, Why it
fits, What to avoid.
Under Carousel Evaluation: "Label: value" lines for Carousel
recommendation, Suitability score, Reason, Recommended slide count, Best
carousel angle, Best platform, Design direction, Color direction,
Final-slide CTA, Viewer takeaway, plus a "Carousel title options:" line
followed by its own three bulleted lines.
Under CTA Options: "Label: value" lines for Engagement CTA, Save/share
CTA, Follow/subscribe/resource/conversion CTA.
Under Recommendations: "Label: value" lines for Strongest title,
Strongest visual hook, Strongest textual hook, Strongest verbal hook,
Strongest thumbnail, Strongest CTA.`;

const TITLE_START_RE = /^(?:#{1,3}\s*)?(?:Title\s*\d*\s*[:.\-]\s*(.+)|(\d+)[.)]\s+(.+))$/i;

function parsePackagingTitles(lines: string[] | undefined): PackagingTitleOption[] {
  const blocks = splitBlocks(lines, TITLE_START_RE);
  return blocks.map((block) => {
    const startMatch = block[0].trim().match(TITLE_START_RE);
    const title = (startMatch?.[1] ?? startMatch?.[3] ?? "Untitled").trim();
    return {
      title,
      researchSupport: labeled(block, "Research support") ?? "",
      viewerProblemAddressed: labeled(block, "Viewer problem addressed") ?? "",
      promiseMade: labeled(block, "Promise made", "Promise") ?? "",
      reasonToClick: labeled(block, "Reason the viewer may click", "Reason to click") ?? "",
      riskOfMisleading: labeled(block, "Risk of misleading the viewer", "Risk of misleading") ?? "",
    };
  });
}

const THUMBNAIL_START_RE = /^(?:#{1,3}\s*)?(?:Thumbnail\s*\d*\s*[:.\-]\s*(.+)|(\d+)[.)]\s+(.+))$/i;

function parseThumbnailSuggestions(lines: string[] | undefined): ThumbnailSuggestion[] {
  const blocks = splitBlocks(lines, THUMBNAIL_START_RE);
  return blocks.map((block) => {
    const startMatch = block[0].trim().match(THUMBNAIL_START_RE);
    const concept = (startMatch?.[1] ?? startMatch?.[3] ?? "Untitled thumbnail").trim();
    return {
      concept,
      mainVisual: labeled(block, "Main visual") ?? "",
      subjectActionOrExpression: labeled(block, "Subject action or expression") ?? "",
      thumbnailText: labeled(block, "Thumbnail text") ?? "",
      colorDirection: labeled(block, "Color direction") ?? "",
      emotionalTrigger: labeled(block, "Emotional trigger") ?? "",
      whyItFits: labeled(block, "Why it fits") ?? "",
      whatToAvoid: labeled(block, "What to avoid") ?? "",
    };
  });
}

// A handful of fields (Carousel title options here, nothing else in
// this template) are a label followed by its OWN bulleted sub-list
// rather than a single "Label: value" line, this walks the lines right
// after the label collecting bullets until a blank line or the next
// non-bullet line ends the list.
function labeledSublist(lines: string[], label: string): string[] {
  const re = new RegExp(`^\\s*(?:[-*]\\s*)?${label}\\s*:?\\s*(.*)$`, "i");
  const idx = lines.findIndex((l) => re.test(l.trim()));
  if (idx === -1) return [];
  const items: string[] = [];
  const inline = lines[idx].trim().match(re)?.[1]?.trim();
  if (inline) items.push(inline);
  for (let i = idx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "") continue;
    if (/^[-*]\s+|^\d+[.)]\s+/.test(line)) {
      items.push(line.replace(/^[-*]\s+|^\d+[.)]\s+/, "").trim());
    } else {
      break;
    }
  }
  return items.filter(Boolean);
}

function parseCarouselEvaluation(lines: string[] | undefined): CarouselEvaluation {
  const block = lines ?? [];
  return {
    recommendation: labeled(block, "Carousel recommendation") ?? "",
    suitabilityScore: labeledScore(block, "Suitability score"),
    reason: labeled(block, "Reason") ?? "",
    recommendedSlideCount: labeled(block, "Recommended slide count") ?? "",
    bestCarouselAngle: labeled(block, "Best carousel angle") ?? "",
    bestPlatform: labeled(block, "Best platform") ?? "",
    titleOptions: labeledSublist(block, "Carousel title options"),
    designDirection: labeled(block, "Design direction") ?? "",
    colorDirection: labeled(block, "Color direction") ?? "",
    finalSlideCta: labeled(block, "Final-slide CTA", "Final slide CTA") ?? "",
    viewerTakeaway: labeled(block, "Viewer takeaway") ?? "",
  };
}

const PACKAGING_CORE_HEADERS = [
  "TITLES",
  "YOUTUBE DESCRIPTION",
  "THUMBNAILS",
  "CAROUSEL EVALUATION",
  "RECOMMENDATIONS",
] as const;

const PACKAGING_HEADERS = [
  "TITLES",
  "YOUTUBE DESCRIPTION",
  "SHORT-FORM CAPTION",
  "INSTAGRAM CAPTION",
  "TIKTOK CAPTION",
  "YOUTUBE SHORTS CAPTION",
  "X CAPTION",
  "THREADS CAPTION",
  "SHORT KEYWORDS",
  "SEARCH PHRASES",
  "THUMBNAILS",
  "VISUAL HOOKS",
  "TEXTUAL HOOKS",
  "VERBAL HOOKS",
  "CAROUSEL EVALUATION",
  "CTA OPTIONS",
  "RECOMMENDATIONS",
] as const;

export function parsePackagingPhasePaste(text: string): PackagingPhaseData | null {
  const sections = splitSections(text, PACKAGING_HEADERS);
  if (!PACKAGING_CORE_HEADERS.every((h) => sections.has(h))) return null;

  const titles = parsePackagingTitles(sections.get("TITLES"));
  const youtubeDescription = joinBlock(sections.get("YOUTUBE DESCRIPTION"));
  const thumbnails = parseThumbnailSuggestions(sections.get("THUMBNAILS"));
  const carousel = parseCarouselEvaluation(sections.get("CAROUSEL EVALUATION"));
  const recommendationLines = sections.get("RECOMMENDATIONS") ?? [];
  const strongestTitle = labeled(recommendationLines, "Strongest title") ?? "";
  if (titles.length === 0 || !youtubeDescription || thumbnails.length === 0 || !carousel.recommendation || !strongestTitle) {
    return null;
  }

  const ctaLines = sections.get("CTA OPTIONS") ?? [];

  return {
    titles,
    platformCopy: {
      youtubeDescription,
      shortFormCaption: joinBlock(sections.get("SHORT-FORM CAPTION")),
      instagramCaption: joinBlock(sections.get("INSTAGRAM CAPTION")),
      tiktokCaption: joinBlock(sections.get("TIKTOK CAPTION")),
      youtubeShortsCaption: joinBlock(sections.get("YOUTUBE SHORTS CAPTION")),
      xCaption: joinBlock(sections.get("X CAPTION")),
      threadsCaption: joinBlock(sections.get("THREADS CAPTION")),
    },
    shortKeywords: listLines(sections.get("SHORT KEYWORDS")),
    searchPhrases: listLines(sections.get("SEARCH PHRASES")),
    thumbnails,
    visualHooks: listLines(sections.get("VISUAL HOOKS")),
    textualHooks: listLines(sections.get("TEXTUAL HOOKS")),
    verbalHooks: listLines(sections.get("VERBAL HOOKS")),
    carousel,
    ctaOptions: {
      engagement: labeled(ctaLines, "Engagement CTA") ?? "",
      saveShare: labeled(ctaLines, "Save/share CTA", "Save.share CTA") ?? "",
      followSubscribeResourceConversion:
        labeled(
          ctaLines,
          "Follow, subscribe, resource, or conversion CTA",
          "Follow/subscribe/resource/conversion CTA",
          "Follow CTA",
        ) ?? "",
    },
    recommendations: {
      strongestTitle,
      strongestVisualHook: labeled(recommendationLines, "Strongest visual hook") ?? "",
      strongestTextualHook: labeled(recommendationLines, "Strongest textual hook") ?? "",
      strongestVerbalHook: labeled(recommendationLines, "Strongest verbal hook") ?? "",
      strongestThumbnail: labeled(recommendationLines, "Strongest thumbnail") ?? "",
      strongestCta: labeled(recommendationLines, "Strongest CTA") ?? "",
    },
  };
}

// ---------------------------------------------------------------------
// Scripting phase (docs/research-packaging-scripting-template.txt Phase 3)
// ---------------------------------------------------------------------

export type LongFormScriptSection = {
  sectionTitle: string;
  purpose: string;
  exactNarration: string;
  visualDirection: string;
  onScreenText: string;
  bRollOrDemonstration: string;
  transition: string;
  approximateTiming: string;
  sourceMarkers: string;
};

export type PointerScriptSection = {
  sectionTitle: string;
  mainPointer: string;
  briefDescription: string;
  whyItMatters: string;
  keyInformation: string;
  exampleToInclude: string;
  questionAnswered: string;
  mistakeToAvoid: string;
  transitionIdea: string;
  approximateTiming: string;
  sourceMarker: string;
};

export type ShortFormSuitability = {
  suitable: string;
  score: number;
  reason: string;
  bestStandaloneInsight: string;
  bestSectionToConvert: string;
  bestPlatform: string;
  recommendedDuration: string;
  recommendedConversionMethod: string;
  contextRisk: string;
  accuracyProtection: string;
};

export type ShortFormScript = {
  title: string;
  hook: string;
  viewerProblem: string;
  oneClearInsight: string;
  example: string;
  practicalTakeaway: string;
  spokenScript: string;
  visualPlan: string;
  onScreenText: string;
  bRoll: string;
  briefDescription: string;
  ctaOptions: string[];
  sourceMarkers: string;
};

export type CarouselScriptSlide = {
  slideNumber: string;
  headline: string;
  body: string;
  visualDirection: string;
  designNote: string;
  sourceMarker: string;
};

export type ScriptingPhaseData = {
  longFormScript: LongFormScriptSection[];
  pointerScript: PointerScriptSection[];
  shortFormSuitability: ShortFormSuitability;
  // null when the suitability score is under 6 (the template's own
  // gate: "If the suitability score is 6 or higher, create...") or the
  // paste simply didn't include one, not something this parser decides
  // on its own.
  thirtySecondScript: ShortFormScript | null;
  sixtySecondScript: ShortFormScript | null;
  additionalShortFormConcepts: ShortFormScript[];
  // Empty when Packaging didn't recommend a carousel, same reasoning.
  carouselScript: CarouselScriptSlide[];
  scriptStrengths: string;
  claimsRequiringVerification: string;
  missingExamples: string;
  personalInformationNeeded: string;
  recommendedProductionStep: string;
  // Raw text of the field, same pattern as Research's
  // researchQualityStatusText: the actual APPROVED/NEEDS
  // REVISION/REJECTED classification is pulled out separately by
  // extractApprovalStatus into manual_workflow_phases.status.
  scriptStatusText: string;
};

export const SCRIPTING_PASTE_TEMPLATE_HINT = `Expects these headers, each on its own line (case-insensitive, optional
leading #/##/### or number, optional trailing colon), matching
docs/research-packaging-scripting-template.txt Phase 3: Long-Form
Script / Pointer Script / Short-Form Suitability / 30-Second Script /
60-Second Script / Additional Short-Form Concepts / Carousel Script /
Closing. 30-Second Script, 60-Second Script, and Additional Short-Form
Concepts are optional (only present when the suitability score is 6 or
higher); Carousel Script is optional (only when Packaging recommended
one).
Under Long-Form Script, each of the 16 sections starts its own "Section
N: <title>" line, then "Label: value" lines for Purpose, Exact
narration, Visual direction, On-screen text, B-roll or demonstration,
Transition, Approximate timing, Source markers.
Under Pointer Script, each point starts its own "Section N: <title>"
line, then "Label: value" lines for Main pointer, Brief description,
Why it matters, Key information, Example to include, Question answered,
Mistake to avoid, Transition idea, Approximate timing, Source marker.
Under 30-Second Script / 60-Second Script and each concept under
Additional Short-Form Concepts (each starting its own "Concept N: <title>"
line): "Label: value" lines for Title, Hook, Viewer problem, One clear
insight, Example, Practical takeaway, Spoken script, Visual plan,
On-screen text, B-roll, Brief description, Source markers, plus a "CTA
options:" line followed by its own three bulleted lines.
Under Carousel Script, each slide starts its own "Slide N: <headline>"
line, then "Label: value" lines for Headline, Body, Visual direction,
Design note, Source marker.
Under Closing: "Label: value" lines for Script strengths, Claims
requiring verification, Missing examples, Personal information needed,
Recommended production step, Script status.`;

const SCRIPT_SECTION_START_RE = /^(?:#{1,3}\s*)?(?:Section\s*\d*\s*[:.\-]\s*(.+)|(\d+)[.)]\s+(.+))$/i;

function sectionTitleFrom(startLine: string): string {
  const m = startLine.trim().match(SCRIPT_SECTION_START_RE);
  return (m?.[1] ?? m?.[3] ?? "Untitled section").trim();
}

function parseLongFormScript(lines: string[] | undefined): LongFormScriptSection[] {
  return splitBlocks(lines, SCRIPT_SECTION_START_RE).map((block) => ({
    sectionTitle: labeled(block, "Section title") ?? sectionTitleFrom(block[0]),
    purpose: labeled(block, "Purpose") ?? "",
    exactNarration: labeled(block, "Exact narration") ?? "",
    visualDirection: labeled(block, "Visual direction") ?? "",
    onScreenText: labeled(block, "On-screen text") ?? "",
    bRollOrDemonstration: labeled(block, "B-roll or demonstration", "B-roll") ?? "",
    transition: labeled(block, "Transition") ?? "",
    approximateTiming: labeled(block, "Approximate timing") ?? "",
    sourceMarkers: labeled(block, "Source markers", "Source marker") ?? "",
  }));
}

function parsePointerScript(lines: string[] | undefined): PointerScriptSection[] {
  return splitBlocks(lines, SCRIPT_SECTION_START_RE).map((block) => ({
    sectionTitle: labeled(block, "Section title") ?? sectionTitleFrom(block[0]),
    mainPointer: labeled(block, "Main pointer") ?? "",
    briefDescription: labeled(block, "Brief description") ?? "",
    whyItMatters: labeled(block, "Why it matters to the viewer", "Why it matters") ?? "",
    keyInformation: labeled(block, "Key information that must be covered", "Key information") ?? "",
    exampleToInclude: labeled(block, "Example to include") ?? "",
    questionAnswered: labeled(block, "Question this point answers", "Question answered") ?? "",
    mistakeToAvoid: labeled(block, "Mistake to avoid") ?? "",
    transitionIdea: labeled(block, "Transition idea") ?? "",
    approximateTiming: labeled(block, "Approximate timing") ?? "",
    sourceMarker: labeled(block, "Source marker", "Source markers") ?? "",
  }));
}

function parseShortFormSuitability(lines: string[] | undefined): ShortFormSuitability {
  const block = lines ?? [];
  return {
    suitable: labeled(block, "Suitable") ?? "",
    score: labeledScore(block, "Score"),
    reason: labeled(block, "Reason") ?? "",
    bestStandaloneInsight: labeled(block, "Best standalone insight") ?? "",
    bestSectionToConvert: labeled(block, "Best section to convert") ?? "",
    bestPlatform: labeled(block, "Best platform") ?? "",
    recommendedDuration: labeled(block, "Recommended duration") ?? "",
    recommendedConversionMethod: labeled(block, "Recommended conversion method") ?? "",
    contextRisk: labeled(block, "Context risk") ?? "",
    accuracyProtection: labeled(block, "Accuracy protection") ?? "",
  };
}

// Shared by the 30/60-second scripts (each its own whole section) and
// each concept block under Additional Short-Form Concepts (already
// split into per-concept blocks by the caller). null when the block has
// no Title line at all, the caller's signal that this optional section
// simply wasn't in the paste (30/60-second scripts are conditional on
// the suitability score, per the template).
function parseShortFormScriptBlock(lines: string[]): ShortFormScript | null {
  const title = labeled(lines, "Title");
  if (!title) return null;
  return {
    title,
    hook: labeled(lines, "Hook") ?? "",
    viewerProblem: labeled(lines, "Viewer problem") ?? "",
    oneClearInsight: labeled(lines, "One clear insight", "Clear insight") ?? "",
    example: labeled(lines, "Example") ?? "",
    practicalTakeaway: labeled(lines, "Practical takeaway") ?? "",
    spokenScript: labeled(lines, "Spoken script") ?? "",
    visualPlan: labeled(lines, "Visual plan") ?? "",
    onScreenText: labeled(lines, "On-screen text") ?? "",
    bRoll: labeled(lines, "B-roll") ?? "",
    briefDescription: labeled(lines, "Brief description") ?? "",
    ctaOptions: labeledSublist(lines, "CTA options"),
    sourceMarkers: labeled(lines, "Source markers", "Source marker") ?? "",
  };
}

const CONCEPT_START_RE = /^(?:#{1,3}\s*)?(?:Concept\s*\d*\s*[:.\-]\s*(.+)|(\d+)[.)]\s+(.+))$/i;

function parseAdditionalShortFormConcepts(lines: string[] | undefined): ShortFormScript[] {
  return splitBlocks(lines, CONCEPT_START_RE)
    .map((block) => parseShortFormScriptBlock(block))
    .filter((s): s is ShortFormScript => s !== null);
}

const SLIDE_START_RE = /^(?:#{1,3}\s*)?(?:Slide\s*\d*\s*[:.\-]\s*(.+)|(\d+)[.)]\s+(.+))$/i;

function parseCarouselScript(lines: string[] | undefined): CarouselScriptSlide[] {
  return splitBlocks(lines, SLIDE_START_RE).map((block, i) => {
    const startMatch = block[0].trim().match(SLIDE_START_RE);
    const inlineHeadline = (startMatch?.[1] ?? startMatch?.[3] ?? "").trim();
    return {
      slideNumber: labeled(block, "Slide number") ?? String(i + 1),
      headline: labeled(block, "Headline") ?? inlineHeadline,
      body: labeled(block, "Body") ?? "",
      visualDirection: labeled(block, "Visual direction") ?? "",
      designNote: labeled(block, "Design note") ?? "",
      sourceMarker: labeled(block, "Source marker", "Source markers") ?? "",
    };
  });
}

const SCRIPTING_CORE_HEADERS = [
  "LONG-FORM SCRIPT",
  "POINTER SCRIPT",
  "SHORT-FORM SUITABILITY",
  "CLOSING",
] as const;

const SCRIPTING_HEADERS = [
  "LONG-FORM SCRIPT",
  "POINTER SCRIPT",
  "SHORT-FORM SUITABILITY",
  "30-SECOND SCRIPT",
  "60-SECOND SCRIPT",
  "ADDITIONAL SHORT-FORM CONCEPTS",
  "CAROUSEL SCRIPT",
  "CLOSING",
] as const;

export function parseScriptingPhasePaste(text: string): ScriptingPhaseData | null {
  const sections = splitSections(text, SCRIPTING_HEADERS);
  if (!SCRIPTING_CORE_HEADERS.every((h) => sections.has(h))) return null;

  const longFormScript = parseLongFormScript(sections.get("LONG-FORM SCRIPT"));
  const pointerScript = parsePointerScript(sections.get("POINTER SCRIPT"));
  const closingLines = sections.get("CLOSING") ?? [];
  const scriptStatusText = labeled(closingLines, "Script status") ?? "";
  if (longFormScript.length === 0 || pointerScript.length === 0 || !scriptStatusText) return null;

  return {
    longFormScript,
    pointerScript,
    shortFormSuitability: parseShortFormSuitability(sections.get("SHORT-FORM SUITABILITY")),
    thirtySecondScript: parseShortFormScriptBlock(sections.get("30-SECOND SCRIPT") ?? []),
    sixtySecondScript: parseShortFormScriptBlock(sections.get("60-SECOND SCRIPT") ?? []),
    additionalShortFormConcepts: parseAdditionalShortFormConcepts(sections.get("ADDITIONAL SHORT-FORM CONCEPTS")),
    carouselScript: parseCarouselScript(sections.get("CAROUSEL SCRIPT")),
    scriptStrengths: labeled(closingLines, "Script strengths") ?? "",
    claimsRequiringVerification: labeled(closingLines, "Claims requiring verification") ?? "",
    missingExamples: labeled(closingLines, "Missing examples") ?? "",
    personalInformationNeeded: labeled(closingLines, "Personal information needed") ?? "",
    recommendedProductionStep: labeled(closingLines, "Recommended production step") ?? "",
    scriptStatusText,
  };
}
