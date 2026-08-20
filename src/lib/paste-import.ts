import type {
  AtomizedShort,
  ResearchCopyContainer,
  ResearchCopyResult,
  ResearchSource,
  ScriptPointer,
  ScriptsResult,
} from "@/lib/types";

// "Paste from AI chat" import, docs/topic-page-redesign.md Section 7:
// free, pattern-based text parsing against a documented plain-text
// template, no Claude API call. Deliberately conservative: if the
// pasted text doesn't confidently match the template's required
// section headers, this returns null rather than guessing at a
// partial/wrong structure, and the caller falls back to showing the
// raw pasted text in an editable area instead of auto-filling anything.
// Pure functions, no server-only imports, so both a client component
// (for an instant no-round-trip confidence check) and the server
// actions that actually save can import this same module.

// Shared by every "paste from AI chat" entry point that targets
// research_copy_versions specifically (the topic page's Research & Copy
// tab, and Content Calendar's "+ New (Manual)" create-from-paste flow),
// one hint text describing the same template either way.
export const RESEARCH_PASTE_TEMPLATE_HINT = `Expects these headers, each on its own line, in this order:
SUMMARY / SOURCES / TITLES / DESCRIPTION / KEYWORD TAGS / QUESTION TAGS / SOURCE FINDINGS (optional).
Sources as "Title - https://...", one per line. Titles as a numbered or bulleted list.
Source findings as "### Source Name (Discussion)" or "### Source Name (Article)" blocks, each with
its own content and an optional "Links:" sub-list underneath (not "Sources:", that collides with the
top-level SOURCES header). See docs/topic-page-redesign.md Section 7.`;

const HEADER_RE =
  /^#{0,3}\s*(SUMMARY|SOURCES|TITLES|DESCRIPTION|KEYWORD TAGS|QUESTION TAGS|SOURCE FINDINGS|HOOKS|PAIN-POINT ANSWER|LONG-FORM SCRIPT|CTA OPTIONS|SHORT-FORM POINTERS|ATOMIZED SHORTS)\s*:?\s*$/i;

function splitSections(text: string): Map<string, string[]> {
  const sections = new Map<string, string[]>();
  let current: string | null = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    const match = line.trim().match(HEADER_RE);
    if (match) {
      current = match[1].toUpperCase();
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

const URL_RE = /(https?:\/\/\S+)/;

function parseSourceLine(line: string): ResearchSource | null {
  const md = line.match(/^\s*[-*]?\s*\[(.+?)\]\((\S+?)\)\s*$/);
  if (md) return { title: md[1].trim(), url: md[2].trim() };

  const urlMatch = line.match(URL_RE);
  if (!urlMatch) return null;
  const url = urlMatch[1].trim();
  const title = line
    .slice(0, urlMatch.index)
    .replace(/^[-*]\s+/, "")
    .replace(/[-—:|]\s*$/, "")
    .trim();
  return { title: title || url, url };
}

function parseSourceList(lines: string[] | undefined): ResearchSource[] {
  const out: ResearchSource[] = [];
  for (const raw of listLines(lines)) {
    const parsed = parseSourceLine(raw);
    if (parsed) out.push(parsed);
  }
  return out;
}

const POINTER_RE = /^\s*[-*]?\s*Point:\s*(.+?)\s*\|\s*Explanation:\s*(.+)$/i;

function parsePointerList(lines: string[]): ScriptPointer[] {
  const out: ScriptPointer[] = [];
  for (const line of lines) {
    const match = line.match(POINTER_RE);
    if (match) out.push({ point: match[1].trim(), explanation: match[2].trim() });
  }
  return out;
}

const CONTAINER_HEADER_RE = /^#{0,3}\s*(.+?)\s*\((Discussion|Article)\)\s*$/i;
// Deliberately not "Sources:" here: splitSections' top-level HEADER_RE
// already treats a bare "SOURCES" line as the start of the global
// sources section, anywhere in the document, not just at the top
// level. A same-named nested sub-marker inside SOURCE FINDINGS would
// falsely re-trigger that top-level match and silently truncate/
// overwrite the real global sources list. "Links:" avoids the collision.
const SOURCES_SUBHEADER_RE = /^Links:\s*$/i;

function parseSourceFindings(lines: string[] | undefined): ResearchCopyContainer[] {
  const containers: ResearchCopyContainer[] = [];
  let current: { sourceName: string; type: "discussion" | "article"; body: string[]; sourceLines: string[] } | null =
    null;
  let inSources = false;

  const flush = () => {
    if (!current) return;
    const sources = parseSourceList(current.sourceLines);
    if (current.type === "discussion") {
      containers.push({
        type: "discussion",
        sourceName: current.sourceName,
        items: listLines(current.body),
        articleSummary: null,
        sources,
      });
    } else {
      containers.push({
        type: "article",
        sourceName: current.sourceName,
        items: null,
        articleSummary: current.body.join("\n").trim() || null,
        sources,
      });
    }
  };

  for (const raw of lines ?? []) {
    const headerMatch = raw.trim().match(CONTAINER_HEADER_RE);
    if (headerMatch) {
      flush();
      current = {
        sourceName: headerMatch[1].trim(),
        type: headerMatch[2].toLowerCase() as "discussion" | "article",
        body: [],
        sourceLines: [],
      };
      inSources = false;
      continue;
    }
    if (!current) continue;
    if (SOURCES_SUBHEADER_RE.test(raw.trim())) {
      inSources = true;
      continue;
    }
    if (inSources) current.sourceLines.push(raw);
    else current.body.push(raw);
  }
  flush();

  return containers;
}

// Required core sections, confidence gate: missing any of these means
// this isn't confidently the documented template, fall back to raw
// editable text rather than auto-filling from a partial guess.
const RESEARCH_CORE_HEADERS = ["SUMMARY", "SOURCES", "TITLES", "DESCRIPTION", "KEYWORD TAGS", "QUESTION TAGS"];

export function parseResearchCopyPaste(text: string): Omit<ResearchCopyResult, "generatedAt"> | null {
  const sections = splitSections(text);
  if (!RESEARCH_CORE_HEADERS.every((h) => sections.has(h))) return null;

  const summary = joinBlock(sections.get("SUMMARY"));
  const description = joinBlock(sections.get("DESCRIPTION"));
  const titles = listLines(sections.get("TITLES"));
  if (!summary || !description || titles.length === 0) return null;

  return {
    summary,
    globalSources: parseSourceList(sections.get("SOURCES")),
    titles,
    description,
    keywordTags: listLines(sections.get("KEYWORD TAGS")),
    questionTags: listLines(sections.get("QUESTION TAGS")),
    containers: parseSourceFindings(sections.get("SOURCE FINDINGS")),
  };
}

const SHORT_HEADER_RE = /^#{0,3}\s*Short\s*\d*:?\s*(.+)$/i;

function parseAtomizedShorts(lines: string[] | undefined): AtomizedShort[] {
  const shorts: AtomizedShort[] = [];
  let current: { title: string; body: string[] } | null = null;

  const flush = () => {
    if (current) shorts.push({ title: current.title, pointerScript: parsePointerList(current.body) });
  };

  for (const raw of lines ?? []) {
    const headerMatch = raw.trim().match(SHORT_HEADER_RE);
    if (headerMatch) {
      flush();
      current = { title: headerMatch[1].trim(), body: [] };
      continue;
    }
    if (current) current.body.push(raw);
  }
  flush();

  return shorts;
}

const SCRIPTS_CORE_HEADERS = [
  "HOOKS",
  "PAIN-POINT ANSWER",
  "LONG-FORM SCRIPT",
  "CTA OPTIONS",
  "SHORT-FORM POINTERS",
];

export function parseScriptsPaste(text: string): Omit<ScriptsResult, "generatedAt"> | null {
  const sections = splitSections(text);
  if (!SCRIPTS_CORE_HEADERS.every((h) => sections.has(h))) return null;

  const hooks = listLines(sections.get("HOOKS"));
  const painPointAnswer = joinBlock(sections.get("PAIN-POINT ANSWER"));
  const longFormScript = joinBlock(sections.get("LONG-FORM SCRIPT"));
  const ctaOptions = listLines(sections.get("CTA OPTIONS"));
  const shortFormPointers = parsePointerList(sections.get("SHORT-FORM POINTERS") ?? []);
  if (hooks.length === 0 || !painPointAnswer || !longFormScript || ctaOptions.length === 0 || shortFormPointers.length === 0) {
    return null;
  }

  return {
    hooks,
    painPointAnswer,
    longFormScript,
    ctaOptions,
    shortFormPointers,
    atomizedShorts: parseAtomizedShorts(sections.get("ATOMIZED SHORTS")),
  };
}
