import type { ManualWorkflowStatus } from "@/lib/types";

// "Paste from AI chat" for the Manual workflow's Research phase
// (docs/manual-workflow-redesign.md, docs/research-packaging-scripting-template.txt
// Phase 1). Same free, pattern-based, no-Claude-call philosophy as
// src/lib/paste-import.ts, deliberately kept as its own self-contained
// module rather than extended into that file: this is a much larger,
// differently-shaped template (26 top-level fields plus two nested
// structures) against a completely separate table
// (manual_workflow_phases, not research_copy_versions/scripts_versions),
// no reason to couple the two parsers' header sets together.
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
