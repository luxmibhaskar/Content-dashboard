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

// Full per-competitor detail from the narrative preamble's COMPETITOR
// RESEARCH section (docs/research-packaging-scripting-template.txt
// Phase 1's "For each important competitor, explain:" list) - distinct
// from ResearchPhaseData's directCompetitorContent/competitorStrengths/
// etc. below, which are the RESEARCH OUTPUT's own compressed
// one-sentence-per-field aggregate across ALL competitors, not a
// per-competitor breakdown. Optional: a paste without a COMPETITOR
// RESEARCH preamble section just yields an empty array here, the 26-item
// RESEARCH OUTPUT fields are unaffected either way.
export type CompetitorProfile = {
  // From the block's own "Competitor N" heading, not a parsed field -
  // used as the last-resort fallback identifier when neither Title nor
  // Creator was labeled (real example: a "general pattern, multiple
  // creators" entry with no Creator label and no Title, only Platform
  // and an unlabeled description).
  competitorNumber: string;
  creator: string;
  platform: string;
  // "Format" is accepted as an alias for this field - the real template
  // output uses it for a "general pattern across many pieces of
  // content" competitor entry where "Title" doesn't really apply.
  title: string;
  url: string;
  publicationDate: string;
  mainPromise: string;
  mainArgument: string;
  keyPointsCovered: string;
  strengths: string;
  weaknesses: string;
  whatTheyMissed: string;
  whatWasOversimplified: string;
  whatEvidenceWasMissing: string;
  whatViewersMayNotUnderstand: string;
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
  competitorProfiles: CompetitorProfile[];
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
date, Claim supported, Confidence level. A one-line "<Title>" - url -
date - claim - confidence per source (date optional) is also accepted
when no "Source title:" labels are present.
Any list field may instead be one semicolon-separated line with no
bullet/number prefix - each clause still becomes its own entry.
A "COMPETITOR RESEARCH" section, if present anywhere before RESEARCH
OUTPUT, is also read: each "Competitor N" block's "Label: value" pairs
(Creator or organization, Platform, Title, URL, Publication date, Main
promise, Main argument, Key points covered, Strengths, Weaknesses, What
they missed, What was oversimplified, What evidence was missing, What
viewers may still not understand) become one competitor profile,
whether packed onto one dense paragraph or one per line. This is
entirely optional and separate from the compressed Direct Competitor
Content / Competitor Strengths / etc. fields above.`;

function buildHeaderRegex(headers: readonly string[]): RegExp {
  const alternation = headers.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return new RegExp(`^#{0,3}\\s*(?:\\d+[.)]\\s*)?(${alternation})\\s*:?\\s*$`, "i");
}

// A header can legitimately appear twice: once as a full write-up
// earlier in the response, and again as a short recap line under the
// final numbered RESEARCH OUTPUT / PACKAGING list (e.g. "20. Content
// Gap Analysis" followed only by "Full analysis above."). Re-matching a
// header never resets what was already captured under it - the second
// occurrence's lines are appended after the first's (with a blank-line
// separator), so whichever occurrence is fuller survives instead of
// being silently clobbered by whichever one happens to come last.
function splitSections(text: string, headers: readonly string[]): Map<string, string[]> {
  const headerRe = buildHeaderRegex(headers);
  const sections = new Map<string, string[]>();
  let current: string | null = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    const match = line.trim().match(headerRe);
    if (match) {
      current = headers.find((h) => h.toLowerCase() === match[1].toLowerCase()) ?? match[1].toUpperCase();
      const existing = sections.get(current);
      if (!existing) {
        sections.set(current, []);
      } else if (existing.length > 0 && existing[existing.length - 1].trim() !== "") {
        existing.push("");
      }
      continue;
    }
    if (current) sections.get(current)!.push(line);
  }
  return sections;
}

function joinBlock(lines: string[] | undefined): string {
  return (lines ?? []).join("\n").trim();
}

// Most list fields ask for one item per line (bulleted or numbered),
// but a pasted response sometimes collapses several items into one
// semicolon-joined sentence instead, with no bullet/number prefix at
// all (e.g. "How long until a first sale; whether paid tools are
// required; ..."). Only a line with no recognized bullet/number prefix
// is split on semicolons - an already-bulleted line keeps its content
// as one item even if it happens to contain a semicolon.
function listLines(lines: string[] | undefined): string[] {
  const out: string[] = [];
  for (const raw of lines ?? []) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const bulletMatch = trimmed.match(/^([-*]\s+|\d+[.)]\s+)/);
    const withoutBullet = bulletMatch ? trimmed.slice(bulletMatch[0].length).trim() : trimmed;
    if (!withoutBullet) continue;
    if (!bulletMatch && withoutBullet.includes(";")) {
      for (const part of withoutBullet.split(";")) {
        const item = part.trim();
        if (item) out.push(item);
      }
    } else {
      out.push(withoutBullet);
    }
  }
  return out;
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

// labeled() above is line-bound: it works when a template's fields each
// get their own line, but a real paste sometimes packs every "Label:
// value" pair for one entry into a single dense paragraph instead (e.g.
// "Viewer problem: ... Viewer desire: ... Risk of becoming generic:
// ..."), with nothing to stop labeled()'s ".+$" from swallowing every
// field after the one it's looking for. This finds where each field's
// own label starts anywhere in the block's text, then bounds each
// field's value to run only up to wherever the NEXT field's label
// starts (by position, not by list order) - which works whether the
// labels are on separate lines or crammed onto one, since in the
// separate-line case the next label's start is simply the next line.
function extractSequentialLabels(
  text: string,
  fields: readonly { key: string; labels: readonly string[] }[],
): Record<string, string> {
  const positions: { key: string; start: number; valueStart: number }[] = [];
  for (const field of fields) {
    for (const label of field.labels) {
      // \b on both ends: without it a short single-word label (e.g.
      // "Creator" when only the longer "Creator or organization" spelling
      // wasn't used) can partial-match inside an unrelated longer word
      // (e.g. the "Creator" in "creators" leaking a stray "s" into the
      // captured value) or inside another label entirely.
      const match = text.match(new RegExp(`\\b${label}\\b\\s*:?\\s*`, "i"));
      if (match && match.index != null) {
        positions.push({ key: field.key, start: match.index, valueStart: match.index + match[0].length });
        break;
      }
    }
  }
  positions.sort((a, b) => a.valueStart - b.valueStart);

  const out: Record<string, string> = {};
  for (let i = 0; i < positions.length; i++) {
    const end = i + 1 < positions.length ? positions[i + 1].start : text.length;
    out[positions[i].key] = text
      .slice(positions[i].valueStart, end)
      .trim()
      .replace(/\s+/g, " ");
  }
  return out;
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

// Order doesn't matter for extraction (extractSequentialLabels sorts by
// where each label actually appears), but this is also the template's
// own field order. "__scoresBoundary" isn't a real output field, it
// just gives riskOfBecomingGeneric somewhere to stop before whichever
// scores format follows it (the per-line "Relevance score: 8" style, or
// the dense "Scores - relevance 8, evidence 6, ..." one-liner).
const OPPORTUNITY_FIELD_LABELS = [
  { key: "viewerProblem", labels: ["Viewer problem"] },
  { key: "viewerDesire", labels: ["Viewer desire"] },
  { key: "unansweredQuestion", labels: ["Unanswered question"] },
  { key: "whatCompetitorsMissed", labels: ["What competitors missed"] },
  { key: "evidenceSupporting", labels: ["Evidence supporting the opportunity", "Evidence"] },
  { key: "missingExample", labels: ["Missing example"] },
  { key: "missingDemonstration", labels: ["Missing demonstration"] },
  { key: "whyItProvidesValue", labels: ["Why it provides value"] },
  { key: "riskOfBecomingGeneric", labels: ["Risk of becoming generic"] },
  { key: "__scoresBoundary", labels: ["Scores", "Relevance score", "Score"] },
] as const;

// Dense one-liner fallback for the real "Scores - relevance 8, evidence
// 6, novelty 7, evergreen 8, visual potential 6." format, tried only
// when none of the five per-line "<Name> score: N" labels were found.
const SCORES_INLINE_RE =
  /Scores?\s*[-:]\s*relevance\s*(\d{1,2})\D+evidence\s*(\d{1,2})\D+novelty\s*(\d{1,2})\D+evergreen\s*(\d{1,2})\D+visual\s*potential\s*(\d{1,2})/i;

function parseContentOpportunities(lines: string[] | undefined): ContentOpportunity[] {
  const blocks = splitBlocks(lines, OPPORTUNITY_START_RE);
  return blocks.map((block) => {
    const startMatch = block[0].trim().match(OPPORTUNITY_START_RE);
    const name = (startMatch?.[1] ?? startMatch?.[3] ?? "Untitled opportunity").trim();
    const text = block.join("\n");
    const fields = extractSequentialLabels(text, OPPORTUNITY_FIELD_LABELS);

    let scores = {
      relevance: labeledScore(block, "Relevance score", "Relevance"),
      evidence: labeledScore(block, "Evidence score"),
      novelty: labeledScore(block, "Novelty score", "Novelty"),
      evergreen: labeledScore(block, "Evergreen value score", "Evergreen score", "Evergreen"),
      visualPotential: labeledScore(block, "Visual potential score", "Visual potential"),
    };
    if (!scores.relevance && !scores.evidence && !scores.novelty && !scores.evergreen && !scores.visualPotential) {
      const inline = text.match(SCORES_INLINE_RE);
      if (inline) {
        scores = {
          relevance: Number(inline[1]),
          evidence: Number(inline[2]),
          novelty: Number(inline[3]),
          evergreen: Number(inline[4]),
          visualPotential: Number(inline[5]),
        };
      }
    }

    return {
      name,
      viewerProblem: fields.viewerProblem ?? "",
      viewerDesire: fields.viewerDesire ?? "",
      unansweredQuestion: fields.unansweredQuestion ?? "",
      whatCompetitorsMissed: fields.whatCompetitorsMissed ?? "",
      evidenceSupporting: fields.evidenceSupporting ?? "",
      missingExample: fields.missingExample ?? "",
      missingDemonstration: fields.missingDemonstration ?? "",
      whyItProvidesValue: fields.whyItProvidesValue ?? "",
      riskOfBecomingGeneric: fields.riskOfBecomingGeneric ?? "",
      scores,
    };
  });
}

// ---------------------------------------------------------------------
// Competitor Research preamble (optional, docs/research-packaging-
// scripting-template.txt Phase 1's "For each important competitor,
// explain:" list, NOT one of the 26 RESEARCH OUTPUT items)
// ---------------------------------------------------------------------

// Bare "Competitor N" line, no colon or name expected (unlike Opportunity
// blocks) - the block's own Title/Creator field, extracted below,
// supplies the display name instead.
const COMPETITOR_START_RE = /^(?:#{1,3}\s*)?Competitor\s*(\d+)\s*:?\s*(.*)$/i;

const COMPETITOR_FIELD_LABELS = [
  { key: "creator", labels: ["Creator or organization", "Creator/organization", "Creator"] },
  { key: "platform", labels: ["Platform"] },
  { key: "title", labels: ["Title", "Format"] },
  { key: "url", labels: ["Direct URL", "URL"] },
  { key: "publicationDate", labels: ["Publication date"] },
  { key: "mainPromise", labels: ["Main promise"] },
  { key: "mainArgument", labels: ["Main argument"] },
  { key: "keyPointsCovered", labels: ["Key points covered"] },
  { key: "strengths", labels: ["Strengths"] },
  { key: "weaknesses", labels: ["Weaknesses"] },
  { key: "whatTheyMissed", labels: ["What they missed"] },
  { key: "whatWasOversimplified", labels: ["What was oversimplified"] },
  { key: "whatEvidenceWasMissing", labels: ["What evidence was missing"] },
  {
    key: "whatViewersMayNotUnderstand",
    labels: ["What viewers may still not understand", "What viewers may not understand"],
  },
] as const;

function parseCompetitorProfiles(lines: string[] | undefined): CompetitorProfile[] {
  const blocks = splitBlocks(lines, COMPETITOR_START_RE);
  return blocks.map((block, i) => {
    const startMatch = block[0].trim().match(COMPETITOR_START_RE);
    const competitorNumber = startMatch?.[1] ?? String(i + 1);
    const text = block.join("\n");
    const fields = extractSequentialLabels(text, COMPETITOR_FIELD_LABELS);
    return {
      competitorNumber,
      creator: fields.creator ?? "",
      platform: fields.platform ?? "",
      title: fields.title ?? "",
      url: fields.url ?? "",
      publicationDate: fields.publicationDate ?? "",
      mainPromise: fields.mainPromise ?? "",
      mainArgument: fields.mainArgument ?? "",
      keyPointsCovered: fields.keyPointsCovered ?? "",
      strengths: fields.strengths ?? "",
      weaknesses: fields.weaknesses ?? "",
      whatTheyMissed: fields.whatTheyMissed ?? "",
      whatWasOversimplified: fields.whatWasOversimplified ?? "",
      whatEvidenceWasMissing: fields.whatEvidenceWasMissing ?? "",
      whatViewersMayNotUnderstand: fields.whatViewersMayNotUnderstand ?? "",
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

// Alternative one-line-per-source format this app also accepts:
// "<Title>" - <url> - <date> - <claim> - <confidence>, e.g.
// "Etsy Shop No Sales 2026? 7 Proven Fixes That Work" - https://... -
// May 9, 2026 - supports the CTR/conversion/review-velocity algorithm
// claim - medium confidence. The date segment is frequently dropped
// when a source is undated, so this reads whichever of [claim,
// confidence] or [date, claim, confidence] fits the number of
// " - "-separated segments found after the URL, rather than requiring
// a fixed position for each. A row that mashes two sources together
// (two quoted titles, two URLs) only yields one, best-effort entry -
// genuinely ambiguous input, not worth guessing apart.
const INLINE_SOURCE_URL_RE = /https?:\/\/\S+/;

function parseInlineSourceLine(line: string): ResearchSourceClaim | null {
  const cleaned = line.trim().replace(/^[-*]\s+|^\d+[.)]\s+/, "");
  const urlMatch = cleaned.match(INLINE_SOURCE_URL_RE);
  if (!urlMatch || urlMatch.index == null) return null;

  const before = cleaned.slice(0, urlMatch.index);
  const quoted = before.match(/"([^"]+)"/);
  const sourceTitle = (quoted ? quoted[1] : before.replace(/[-—:|]\s*$/, "")).trim();
  if (!sourceTitle) return null;

  const url = urlMatch[0].replace(/[.,;:]+$/, "");
  const after = cleaned.slice(urlMatch.index + urlMatch[0].length);
  const segments = after
    .split(/\s-\s/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  let publicationDate = "";
  let claimSupported = "";
  let confidenceRaw = "";
  if (segments.length === 1) {
    confidenceRaw = segments[0];
  } else if (segments.length === 2) {
    [claimSupported, confidenceRaw] = segments;
  } else if (segments.length >= 3) {
    publicationDate = segments[0];
    confidenceRaw = segments[segments.length - 1];
    claimSupported = segments.slice(1, -1).join(" - ");
  }

  return {
    sourceTitle,
    url,
    publicationDate,
    claimSupported,
    confidence: normalizeConfidence(confidenceRaw),
  };
}

function parseResearchSources(lines: string[] | undefined): ResearchSourceClaim[] {
  const raw = lines ?? [];

  if (raw.some((l) => SOURCE_START_RE.test(l.trim()))) {
    const blocks = splitBlocks(raw, SOURCE_START_RE);
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

  // Fallback: no "Source title:" labels found anywhere in this section,
  // try the one-line-per-source inline format instead.
  const out: ResearchSourceClaim[] = [];
  for (const line of raw) {
    if (!/https?:\/\//.test(line)) continue;
    const parsed = parseInlineSourceLine(line);
    if (parsed) out.push(parsed);
  }
  return out;
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
  // Optional preamble section, not one of the 26 RESEARCH OUTPUT items -
  // not in RESEARCH_PHASE_CORE_HEADERS below, so its absence never
  // affects whether a paste parses.
  "COMPETITOR RESEARCH",
  // Recognized ONLY so it closes off COMPETITOR RESEARCH above (the next
  // real RESEARCH OUTPUT header, CONTENT GAP ANALYSIS, is far below it,
  // with the entire raw audience-comments preamble in between) - its own
  // captured lines are deliberately never read by anything below. That
  // preamble content stays exactly as scoped: visible only in the raw-
  // text viewer, not parsed into any field.
  "AUDIENCE QUESTIONS AND COMMENTS",
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
    competitorProfiles: parseCompetitorProfiles(sections.get("COMPETITOR RESEARCH")),
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
line (a bare "Thumbnail N" line with nothing else is also accepted), then
"Label: value" lines for Main visual, Subject action or expression,
Thumbnail text, Color direction, Emotional trigger, Why it fits, What
to avoid.
Under Carousel Evaluation: "Label: value" lines for Carousel
recommendation, Suitability score, Reason, Recommended slide count, Best
carousel angle, Best platform, Design direction, Color direction,
Final-slide CTA, Viewer takeaway, plus either a "Carousel title options:"
line followed by its own three bulleted lines, or three separate
"Carousel title option 1:" / "option 2:" / "option 3:" lines.
Under CTA Options: "Label: value" lines for Engagement CTA, Save/share
CTA, Follow/subscribe/resource/conversion CTA.
Under Recommendations: "Label: value" lines for Strongest title,
Strongest visual hook, Strongest textual hook, Strongest verbal hook,
Strongest thumbnail, Strongest CTA.
"Titles" also accepts "Title Options", "YouTube Description" also accepts
"YouTube Video Description", and "Thumbnails" also accepts "Thumbnail
Suggestions" as section headers.
Short Keywords and Search Phrases may instead be one comma-separated
line with no bullet/number prefix - each item still becomes its own
entry.`;

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

// The colon-plus-title group is optional (real output sometimes uses a
// bare "Thumbnail N" heading with nothing else on that line, the name
// coming only from the "Thumbnail text" field inside the block) - group
// 1 is the thumbnail's own number either way, group 2 the inline title
// when present, groups 3/4 the plain-numbered-list form unchanged.
const THUMBNAIL_START_RE =
  /^(?:#{1,3}\s*)?(?:Thumbnail\s*(\d*)\s*(?:[:.\-]\s*(.+))?|(\d+)[.)]\s+(.+))$/i;

function parseThumbnailSuggestions(lines: string[] | undefined): ThumbnailSuggestion[] {
  const blocks = splitBlocks(lines, THUMBNAIL_START_RE);
  return blocks.map((block) => {
    const startMatch = block[0].trim().match(THUMBNAIL_START_RE);
    const number = startMatch?.[1] || startMatch?.[3];
    const concept = (
      startMatch?.[2] ??
      startMatch?.[4] ??
      (number ? `Thumbnail ${number}` : null) ??
      "Untitled thumbnail"
    ).trim();
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

// Real output sometimes writes the three carousel titles as three
// separately-numbered labeled lines ("Carousel title option 1:",
// "option 2:", "option 3:") instead of one "Carousel title options:"
// line followed by its own bulleted sub-list. Tried only when the
// sublist form isn't found - the two patterns don't collide (this one
// requires a number right after "option", the sublist label requires
// the plural "options" with no number), so trying both is unambiguous.
const CAROUSEL_TITLE_OPTION_RE = /^\s*(?:[-*]\s*)?Carousel title option\s*\d+\s*:?\s*(.+)$/i;

function parseCarouselTitleOptions(block: string[]): string[] {
  const sublist = labeledSublist(block, "Carousel title options");
  if (sublist.length > 0) return sublist;
  const out: string[] = [];
  for (const line of block) {
    const match = line.trim().match(CAROUSEL_TITLE_OPTION_RE);
    if (match) out.push(match[1].trim());
  }
  return out;
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
    titleOptions: parseCarouselTitleOptions(block),
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

// Real Packaging output sometimes uses different header wording than
// the template's own section names for the same content (a skill
// paraphrasing its own headers, not a formatting quirk). Rewritten to
// the canonical header text, on the same line, before splitSections
// ever runs - keeps splitSections/buildHeaderRegex themselves generic
// (shared by all three phases) rather than teaching them an alias
// concept just for Packaging's three cases.
const PACKAGING_HEADER_ALIASES: [RegExp, string][] = [
  [/^(\s*#{0,3}\s*(?:\d+[.)]\s*)?)TITLE OPTIONS(\s*:?\s*)$/gim, "$1TITLES$2"],
  [/^(\s*#{0,3}\s*(?:\d+[.)]\s*)?)YOUTUBE VIDEO DESCRIPTION(\s*:?\s*)$/gim, "$1YOUTUBE DESCRIPTION$2"],
  [/^(\s*#{0,3}\s*(?:\d+[.)]\s*)?)THUMBNAIL SUGGESTIONS(\s*:?\s*)$/gim, "$1THUMBNAILS$2"],
];

function normalizePackagingHeaderAliases(text: string): string {
  let normalized = text;
  for (const [re, replacement] of PACKAGING_HEADER_ALIASES) {
    normalized = normalized.replace(re, replacement);
  }
  return normalized;
}

// Short Keywords and Search Phrases are meant to be one item per line,
// but real output sometimes writes them as a single comma-joined line
// instead. Comma-splitting isn't safe as a change to listLines() itself
// (used by several Research-phase list fields whose items are natural
// prose that legitimately contains commas, delimited by semicolons
// instead - splitting those on commas too would break them), so this
// stays local to just these two fields: split on commas only when the
// line has no bullet/number prefix and no semicolons (a semicolon-
// joined line still wins if the line happens to have both, matching
// listLines()'s own precedence).
function splitKeywordLikeList(lines: string[] | undefined): string[] {
  const out: string[] = [];
  for (const raw of lines ?? []) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const bulletMatch = trimmed.match(/^([-*]\s+|\d+[.)]\s+)/);
    const withoutBullet = bulletMatch ? trimmed.slice(bulletMatch[0].length).trim() : trimmed;
    if (!withoutBullet) continue;
    const splitter = !bulletMatch && withoutBullet.includes(";") ? ";" : !bulletMatch && withoutBullet.includes(",") ? "," : null;
    if (splitter) {
      for (const part of withoutBullet.split(splitter)) {
        const item = part.trim();
        if (item) out.push(item);
      }
    } else {
      out.push(withoutBullet);
    }
  }
  return out;
}

export function parsePackagingPhasePaste(text: string): PackagingPhaseData | null {
  const sections = splitSections(normalizePackagingHeaderAliases(text), PACKAGING_HEADERS);
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
    shortKeywords: splitKeywordLikeList(sections.get("SHORT KEYWORDS")),
    searchPhrases: splitKeywordLikeList(sections.get("SEARCH PHRASES")),
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
