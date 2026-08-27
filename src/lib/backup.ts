import { createClient as createServiceClient, type SupabaseClient } from "@supabase/supabase-js";
import { writeSheetTabs } from "@/lib/google-sheets";
import { syncDriveArchive, type DriveLinks } from "@/lib/drive-archive";
import { archiveIdleContent } from "@/lib/archive-lifecycle";
import { BRANDS, BRAND_LABELS, type Brand } from "@/lib/brand";
import { resolveGoalCurrentValues } from "@/lib/goals";
import { totalAcrossPosts, type ContentPlatformPostWithSnapshots } from "@/lib/platform-analytics";
import { WALK_STREAK_LABEL } from "@/lib/streaks";
import {
  formatScriptHooks,
  type ResearchCopyResult,
  type ScriptHooks,
  type ScriptsResult,
  type Goal,
  type ManualWorkflowPhaseRow,
} from "@/lib/types";
import type {
  PackagingPhaseData,
  ResearchPhaseData,
  ScriptingPhaseData,
} from "@/lib/manual-workflow-parsing";

type Row = (string | number | boolean | null)[];
type Tab = { title: string; headers: string[]; rows: Row[] };

// Backup coverage audit (2026-08-27): every tab ends with a "Created At"
// / "Updated At" pair, read straight from the source row's own
// created_at / updated_at columns (every table has both, each with the
// shared set_updated_at() trigger). Raw ISO strings, same passthrough
// treatment every other timestamp in this file gets (snapshot_date,
// generatedAt, etc.), written RAW so Sheets stores them verbatim. This
// is a one-way, read-only backup signal ("when was this row last
// touched"), not an import key, no restore logic reads it back.
const TIMESTAMP_HEADERS = ["Created At", "Updated At"];

function supabaseAdmin(): SupabaseClient {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function sheetIdFor(brand: Brand): string {
  const key =
    brand === "lbstransformation"
      ? "GOOGLE_SHEETS_BACKUP_ID_LBSTRANSFORMATION"
      : "GOOGLE_SHEETS_BACKUP_ID_LBSWORKS";
  const id = process.env[key];
  if (!id) throw new Error(`${key} is not configured.`);
  return id;
}

async function contentTitleMap(supabase: SupabaseClient, brand: Brand) {
  const { data } = await supabase
    .from("content_calendar")
    .select("id, final_title")
    .eq("brand", brand);
  return new Map<string, string>(
    (data ?? []).map((r: { id: string; final_title: string | null }) => [
      r.id,
      r.final_title || "Untitled",
    ]),
  );
}

function sourceCount(data: unknown) {
  if (Array.isArray(data)) return data.length;
  return data ? 1 : 0;
}

async function buildJourneyLogTab(supabase: SupabaseClient, brand: Brand): Promise<Tab> {
  const { data } = await supabase
    .from("journey_log")
    .select(
      "entry_date, pillar_focus, sub_topic, what_i_did_experienced, key_lesson_insight, proof_results, mood_energy, tags_keywords, angle_worthy, created_at, updated_at",
    )
    .eq("brand", brand)
    .order("entry_date", { ascending: false });

  const rows: Row[] = (data ?? []).map((r) => [
    r.entry_date,
    (r.pillar_focus ?? []).join(", "),
    (r.sub_topic ?? []).join(", "),
    r.what_i_did_experienced,
    r.key_lesson_insight,
    r.proof_results,
    r.mood_energy,
    r.tags_keywords,
    r.angle_worthy ? "Yes" : "No",
    r.created_at,
    r.updated_at,
  ]);

  return {
    title: "Journey Log",
    headers: [
      "Date",
      "Pillar",
      "Sub-topic",
      "What I Did",
      "Key Lesson",
      "Proof",
      "Mood",
      "Tags",
      "Angle-Worthy",
      ...TIMESTAMP_HEADERS,
    ],
    rows,
  };
}

async function buildIdeasTab(supabase: SupabaseClient, brand: Brand): Promise<Tab> {
  const { data } = await supabase
    .from("ideas")
    .select(
      "idea_title, pillar, sub_topic, format, platform, brief_description, reference_url, idea_source, source_detail, status, created_at, updated_at",
    )
    .eq("brand", brand)
    .order("created_at", { ascending: false });

  const rows: Row[] = (data ?? []).map((r) => [
    r.idea_title,
    r.pillar,
    r.sub_topic,
    r.format,
    // Idea Panel format field (2026-08-27): supabase/migrations/0022_ideas_platform.sql,
    // same shape as content_calendar.platform, same join-with-comma rendering
    // as that tab's own Platform column.
    (r.platform ?? []).join(", "),
    r.brief_description,
    r.reference_url,
    // Backup coverage audit (2026-08-27) Phase 2: idea_source and
    // source_detail are real fields on the Idea edit page's "Idea
    // source" dropdown and "Source detail" text input, never selected
    // here before.
    r.idea_source,
    r.source_detail,
    r.status,
    r.created_at,
    r.updated_at,
  ]);

  return {
    title: "Ideas",
    headers: [
      "Idea Title",
      "Pillar",
      "Sub-topic",
      "Format",
      "Platform",
      "Brief Description",
      "Reference URL",
      "Idea Source",
      "Source Detail",
      "Status",
      ...TIMESTAMP_HEADERS,
    ],
    rows,
  };
}

async function buildContentCalendarTab(
  supabase: SupabaseClient,
  brand: Brand,
  contentLinks: Map<string, string>,
): Promise<Tab> {
  // Backup coverage audit (2026-08-27) Phase 2: final_description (Short
  // description), conversions, and derived_from_content_id were all
  // real, currently-editable topic-page fields with no column here.
  // derived_from_content_id resolves to the source item's own title
  // (contentTitleMap), same "readable, not a raw uuid" treatment every
  // other content_id reference in this file already gets, matching the
  // "Repurposed from: X" display the live topic page shows.
  const [{ data }, contentTitles] = await Promise.all([
    supabase
      .from("content_calendar")
      .select(
        "id, final_title, viewer_problem, promise_outcome, pillar, sub_topic, format, platform, publish_date, production_status, viability_status, final_description, conversions, derived_from_content_id, earned_the_click, created_at, updated_at",
      )
      .eq("brand", brand)
      .order("publish_date", { ascending: false }),
    contentTitleMap(supabase, brand),
  ]);

  const rows: Row[] = (data ?? []).map((r) => [
    r.final_title,
    r.viewer_problem,
    r.promise_outcome,
    r.pillar,
    r.sub_topic,
    r.format,
    (r.platform ?? []).join(", "),
    r.publish_date,
    r.production_status,
    r.viability_status,
    r.final_description,
    r.conversions,
    r.derived_from_content_id ? (contentTitles.get(r.derived_from_content_id) ?? r.derived_from_content_id) : "",
    r.earned_the_click,
    contentLinks.get(r.id) ?? "",
    r.created_at,
    r.updated_at,
  ]);

  return {
    title: "Content Calendar",
    headers: [
      "Title",
      "Viewer Problem",
      "Promise",
      "Pillar",
      "Sub-topic",
      "Format",
      "Platform",
      "Publish Date",
      "Production Status",
      "Viability Status",
      "Short Description",
      "Conversions",
      "Idea Derived From",
      "Earned The Click",
      "Full Detail Link",
      ...TIMESTAMP_HEADERS,
    ],
    rows,
  };
}

// Audit finding, fixed here: research_copy_versions/scripts_versions
// (docs/topic-page-redesign.md Section 2's real Tab 1/Tab 2 content, one
// row per source per content item, Manual and AI can coexist) had zero
// Sheets coverage since the table was created, this is the index; full
// nested detail (per-container source findings, per-short pointer
// scripts) lives in the Drive Markdown/JSON archive instead of being
// flattened into a spreadsheet cell, same division of labor as every
// other tab here.
async function buildResearchCopyVersionsTab(supabase: SupabaseClient, brand: Brand): Promise<Tab> {
  const contentTitles = await contentTitleMap(supabase, brand);
  const { data } = await supabase
    .from("research_copy_versions")
    .select("content_id, source, is_live, data, created_at, updated_at")
    .eq("brand", brand);

  const rows: Row[] = (data ?? []).map((v) => {
    const d = v.data as ResearchCopyResult;
    return [
      contentTitles.get(v.content_id) ?? v.content_id,
      v.source,
      v.is_live ? "Yes" : "No",
      d.summary,
      (d.titles ?? []).join("; "),
      d.description,
      (d.keywordTags ?? []).join(", "),
      (d.questionTags ?? []).join(", "),
      (d.containers ?? []).map((c) => `${c.sourceName} (${c.type})`).join(", "),
      d.generatedAt,
      v.created_at,
      v.updated_at,
    ];
  });

  return {
    title: "Research & Copy",
    headers: [
      "Content Item",
      "Source",
      "Is Live",
      "Summary",
      "Titles",
      "Description",
      "Keyword Tags",
      "Question Tags",
      "Source Containers",
      "Generated At",
      ...TIMESTAMP_HEADERS,
    ],
    rows,
  };
}

// Backup coverage audit (2026-08-27) Phase 2: manual_workflow_phases
// (the Manual workflow's own Research/Packaging/Scripting phase data -
// raw pasted text plus each phase's own parsed structure,
// manual-workflow-parsing.ts) had zero coverage anywhere, Sheets or
// Drive. This is a genuinely different table from
// research_copy_versions/scripts_versions above (which are already
// covered) - the app has two parallel places Manual-side content can
// land depending on which paste form was used.
//
// One row per (content_id, phase); parsed_data's shape is phase-specific
// (ResearchPhaseData/PackagingPhaseData/ScriptingPhaseData), so this tab
// carries every column all three phases could ever need, but only the
// columns matching a given row's own phase are ever populated, the rest
// stay blank on that row. Nested arrays/objects get the same "key: value"
// join summary every other tab in this file already uses for equivalent
// data (Scripts' shortFormPointers, Research & Copy's containers), not
// one column per nested sub-field - this is genuinely the richest
// structure in the schema (Scripting's longFormScript alone is an array
// of 9-field objects), a column per sub-field would run into the
// hundreds.
function joinPairs<T>(items: T[] | null | undefined, pick: (item: T) => [string, string]): string | null {
  const joined = (items ?? [])
    .map((item) => {
      const [a, b] = pick(item);
      return b ? `${a}: ${b}` : a;
    })
    .join("; ");
  return joined || null;
}

function formatShortFormScript(s: { title: string; hook: string } | null | undefined): string | null {
  if (!s) return null;
  return `${s.title}: ${s.hook}`;
}

const MANUAL_PACKAGING_PLATFORM_LABELS: Record<keyof PackagingPhaseData["platformCopy"], string> = {
  youtubeDescription: "YouTube Description",
  shortFormCaption: "Short-Form Caption",
  instagramCaption: "Instagram Caption",
  tiktokCaption: "TikTok Caption",
  youtubeShortsCaption: "YouTube Shorts Caption",
  xCaption: "X Caption",
  threadsCaption: "Threads Caption",
};

const MANUAL_WORKFLOW_RESEARCH_COLUMN_COUNT = 26;
const MANUAL_WORKFLOW_PACKAGING_COLUMN_COUNT = 11;
const MANUAL_WORKFLOW_SCRIPTING_COLUMN_COUNT = 13;

function blankColumns(count: number): null[] {
  return Array(count).fill(null);
}

function researchPhaseColumns(data: unknown): Row {
  const d = (data ?? {}) as Partial<ResearchPhaseData>;
  return [
    d.topicDefinition ?? null,
    d.primaryPillarAndSubtopic ?? null,
    d.mainAudienceProblem ?? null,
    d.audienceDesire ?? null,
    d.audienceConfusion ?? null,
    d.currentDevelopments ?? null,
    d.importantFindings ?? null,
    d.directCompetitorContent ?? null,
    d.relatedContent ?? null,
    d.competitorStrengths ?? null,
    d.competitorWeaknesses ?? null,
    d.whatCompetitorsMissed ?? null,
    (d.frequentlyAskedQuestions ?? []).join("; ") || null,
    (d.unansweredQuestions ?? []).join("; ") || null,
    (d.viewerPainPoints ?? []).join("; ") || null,
    (d.viewerObjections ?? []).join("; ") || null,
    (d.viewerMisunderstandings ?? []).join("; ") || null,
    (d.viewerRequests ?? []).join("; ") || null,
    (d.viewerSuggestions ?? []).join("; ") || null,
    d.contentGapAnalysis ?? null,
    joinPairs(d.contentOpportunities, (o) => [o.name, o.viewerProblem]),
    d.recommendedOpportunity ?? null,
    d.viewerTransformationOrDesiredOutcome ?? null,
    joinPairs(d.sources, (s) => [s.sourceTitle, s.confidence]),
    d.researchLimitations ?? null,
    d.researchQualityStatusText ?? null,
  ];
}

function packagingPhaseColumns(data: unknown): Row {
  const d = (data ?? {}) as Partial<PackagingPhaseData>;
  const platformCopy = d.platformCopy
    ? (Object.keys(MANUAL_PACKAGING_PLATFORM_LABELS) as (keyof PackagingPhaseData["platformCopy"])[])
        .map((k) => `${MANUAL_PACKAGING_PLATFORM_LABELS[k]}: ${d.platformCopy![k]}`)
        .join("; ") || null
    : null;
  const carousel = d.carousel
    ? `${d.carousel.recommendation} (score ${d.carousel.suitabilityScore}/10): ${d.carousel.reason}`
    : null;
  const ctaOptions = d.ctaOptions
    ? `Engagement: ${d.ctaOptions.engagement}; Save/Share: ${d.ctaOptions.saveShare}; Follow/Subscribe/Resource/Conversion: ${d.ctaOptions.followSubscribeResourceConversion}`
    : null;
  const recommendations = d.recommendations
    ? `Title: ${d.recommendations.strongestTitle}; Visual Hook: ${d.recommendations.strongestVisualHook}; Textual Hook: ${d.recommendations.strongestTextualHook}; Verbal Hook: ${d.recommendations.strongestVerbalHook}; Thumbnail: ${d.recommendations.strongestThumbnail}; CTA: ${d.recommendations.strongestCta}`
    : null;
  return [
    joinPairs(d.titles, (t) => [t.title, t.reasonToClick]),
    platformCopy,
    (d.shortKeywords ?? []).join(", ") || null,
    (d.searchPhrases ?? []).join(", ") || null,
    joinPairs(d.thumbnails, (t) => [t.concept, t.mainVisual]),
    (d.visualHooks ?? []).join("; ") || null,
    (d.textualHooks ?? []).join("; ") || null,
    (d.verbalHooks ?? []).join("; ") || null,
    carousel,
    ctaOptions,
    recommendations,
  ];
}

function scriptingPhaseColumns(data: unknown): Row {
  const d = (data ?? {}) as Partial<ScriptingPhaseData>;
  const suitability = d.shortFormSuitability
    ? `${d.shortFormSuitability.suitable} (score ${d.shortFormSuitability.score}/10): ${d.shortFormSuitability.reason}`
    : null;
  return [
    joinPairs(d.longFormScript, (s) => [s.sectionTitle, s.exactNarration]),
    joinPairs(d.pointerScript, (s) => [s.sectionTitle, s.mainPointer]),
    suitability,
    formatShortFormScript(d.thirtySecondScript),
    formatShortFormScript(d.sixtySecondScript),
    joinPairs(d.additionalShortFormConcepts, (s) => [s.title, s.hook]),
    joinPairs(d.carouselScript, (s) => [`Slide ${s.slideNumber}`, s.headline]),
    d.scriptStrengths ?? null,
    d.claimsRequiringVerification ?? null,
    d.missingExamples ?? null,
    d.personalInformationNeeded ?? null,
    d.recommendedProductionStep ?? null,
    d.scriptStatusText ?? null,
  ];
}

async function buildManualWorkflowPhasesTab(supabase: SupabaseClient, brand: Brand): Promise<Tab> {
  const contentTitles = await contentTitleMap(supabase, brand);
  const { data } = await supabase
    .from("manual_workflow_phases")
    .select("content_id, phase, raw_pasted_text, parsed_data, status, created_at, updated_at")
    .eq("brand", brand);

  const rows: Row[] = (data ?? []).map((row) => {
    const r = row as unknown as {
      content_id: string;
      phase: ManualWorkflowPhaseRow["phase"];
      raw_pasted_text: string | null;
      parsed_data: unknown;
      status: string | null;
      created_at: string;
      updated_at: string;
    };
    const common: Row = [
      contentTitles.get(r.content_id) ?? r.content_id,
      r.phase,
      r.status,
      r.raw_pasted_text,
    ];

    const research = r.phase === "research" ? researchPhaseColumns(r.parsed_data) : blankColumns(MANUAL_WORKFLOW_RESEARCH_COLUMN_COUNT);
    const packaging =
      r.phase === "packaging" ? packagingPhaseColumns(r.parsed_data) : blankColumns(MANUAL_WORKFLOW_PACKAGING_COLUMN_COUNT);
    const scripting =
      r.phase === "scripting" ? scriptingPhaseColumns(r.parsed_data) : blankColumns(MANUAL_WORKFLOW_SCRIPTING_COLUMN_COUNT);

    return [...common, ...research, ...packaging, ...scripting, r.created_at, r.updated_at];
  });

  return {
    title: "Manual Workflow Phases",
    headers: [
      "Content Item",
      "Phase",
      "Status",
      "Raw Pasted Text",
      // Research
      "Topic Definition",
      "Primary Pillar and Subtopic",
      "Main Audience Problem",
      "Audience Desire",
      "Audience Confusion",
      "Current Developments",
      "Important Findings",
      "Direct Competitor Content",
      "Related Content",
      "Competitor Strengths",
      "Competitor Weaknesses",
      "What Competitors Missed",
      "Frequently Asked Questions",
      "Unanswered Questions",
      "Viewer Pain Points",
      "Viewer Objections",
      "Viewer Misunderstandings",
      "Viewer Requests",
      "Viewer Suggestions",
      "Content Gap Analysis",
      "Content Opportunities",
      "Recommended Opportunity",
      "Viewer Transformation Or Desired Outcome",
      "Research Sources",
      "Research Limitations",
      "Research Quality Status",
      // Packaging
      "Titles",
      "Platform Copy",
      "Short Keywords",
      "Search Phrases",
      "Thumbnails",
      "Visual Hooks",
      "Textual Hooks",
      "Verbal Hooks",
      "Carousel Evaluation",
      "CTA Options",
      "Recommendations",
      // Scripting
      "Long-Form Script",
      "Pointer Script",
      "Short-Form Suitability",
      "30-Second Script",
      "60-Second Script",
      "Additional Short-Form Concepts",
      "Carousel Script",
      "Script Strengths",
      "Claims Requiring Verification",
      "Missing Examples",
      "Personal Information Needed",
      "Recommended Production Step",
      "Script Status",
      ...TIMESTAMP_HEADERS,
    ],
    rows,
  };
}

async function buildScriptsVersionsTab(supabase: SupabaseClient, brand: Brand): Promise<Tab> {
  const contentTitles = await contentTitleMap(supabase, brand);
  const { data } = await supabase
    .from("scripts_versions")
    .select("content_id, source, is_live, data, created_at, updated_at")
    .eq("brand", brand);

  const rows: Row[] = (data ?? []).map((v) => {
    const d = v.data as ScriptsResult;
    return [
      contentTitles.get(v.content_id) ?? v.content_id,
      v.source,
      v.is_live ? "Yes" : "No",
      formatScriptHooks(d.hooks as ScriptHooks | string[]),
      d.painPointAnswer,
      d.longFormScript,
      (d.ctaOptions ?? []).join("; "),
      (d.shortFormPointers ?? []).map((p) => `${p.point}: ${p.explanation}`).join("; "),
      (d.atomizedShorts ?? []).map((s) => s.title).join(", "),
      d.generatedAt,
      v.created_at,
      v.updated_at,
    ];
  });

  return {
    title: "Scripts",
    headers: [
      "Content Item",
      "Source",
      "Is Live",
      "Hooks",
      "Pain-Point Answer",
      "Long-Form Script",
      "CTA Options",
      "Short-Form Pointers",
      "Atomized Shorts",
      "Generated At",
      ...TIMESTAMP_HEADERS,
    ],
    rows,
  };
}

async function buildVariantsTab(supabase: SupabaseClient, brand: Brand): Promise<Tab> {
  const contentTitles = await contentTitleMap(supabase, brand);

  const [{ data: titles }, { data: hooks }, { data: thumbs }] = await Promise.all([
    supabase
      .from("title_variants")
      .select("content_id, variant_text, rank, source, performance_rating, is_live, created_at, updated_at")
      .eq("brand", brand),
    supabase
      .from("hook_variants")
      .select(
        "content_id, variant_text, rank, source, performance_rating, is_live, hook_type, created_at, updated_at",
      )
      .eq("brand", brand),
    supabase
      .from("thumbnail_variants")
      .select("content_id, concept, rank, source, performance_rating, is_live, created_at, updated_at")
      .eq("brand", brand),
  ]);

  const rows: Row[] = [
    ...(titles ?? []).map((v) => [
      "Title",
      contentTitles.get(v.content_id) ?? v.content_id,
      v.variant_text,
      v.rank,
      v.source,
      v.performance_rating,
      v.is_live ? "Yes" : "No",
      // No hook_type equivalent on title_variants.
      null,
      v.created_at,
      v.updated_at,
    ]),
    ...(hooks ?? []).map((v) => [
      "Hook",
      contentTitles.get(v.content_id) ?? v.content_id,
      v.variant_text,
      v.rank,
      v.source,
      v.performance_rating,
      v.is_live ? "Yes" : "No",
      // Analytics audit (2026-08-27) Phase 4: 0021_hook_variants_type.sql.
      // Only hooks marked live since that fix carry a value, earlier rows
      // are null.
      v.hook_type,
      v.created_at,
      v.updated_at,
    ]),
    ...(thumbs ?? []).map((v) => [
      "Thumbnail",
      contentTitles.get(v.content_id) ?? v.content_id,
      v.concept,
      v.rank,
      v.source,
      v.performance_rating,
      v.is_live ? "Yes" : "No",
      // No hook_type equivalent on thumbnail_variants.
      null,
      v.created_at,
      v.updated_at,
    ]),
  ];

  return {
    title: "Variants",
    headers: [
      "Variant Type",
      "Content Item",
      "Text",
      "Rank",
      "Source",
      "Performance Rating",
      "Is Live",
      "Hook Type",
      ...TIMESTAMP_HEADERS,
    ],
    rows,
  };
}

// Backup coverage audit (2026-08-27) Phase 2: hook_library_entries (the
// Delivery-Mode Hooks swipe file - imported from a file, typed in
// directly via "Write a hook", or added from a topic page's "Use"
// action) had zero coverage in this pipeline, its only export was the
// separate, manual, local-file-only /api/hook-library/export route.
// Not content-item-linked (a swipe file entry isn't tied to one piece
// of content), so no Full Detail Link column, same shape as
// Competitors/Collaborators above.
async function buildHookLibraryTab(supabase: SupabaseClient, brand: Brand): Promise<Tab> {
  const { data } = await supabase
    .from("hook_library_entries")
    .select("type, content, created_at, updated_at")
    .eq("brand", brand)
    .order("type", { ascending: true })
    .order("created_at", { ascending: true });

  const rows: Row[] = (data ?? []).map((r) => [r.type, r.content, r.created_at, r.updated_at]);

  return {
    title: "Hook Library",
    headers: ["Type", "Content", ...TIMESTAMP_HEADERS],
    rows,
  };
}

async function buildReferenceVideosTab(supabase: SupabaseClient, brand: Brand): Promise<Tab> {
  const contentTitles = await contentTitleMap(supabase, brand);
  const { data } = await supabase
    .from("reference_videos")
    .select("content_id, url, hook_note, rehook_note, cta_note, date_added, created_at, updated_at")
    .eq("brand", brand);

  const rows: Row[] = (data ?? []).map((r) => [
    contentTitles.get(r.content_id) ?? r.content_id,
    r.url,
    r.hook_note,
    r.rehook_note,
    r.cta_note,
    r.date_added,
    r.created_at,
    r.updated_at,
  ]);

  return {
    title: "Reference Videos",
    headers: [
      "Content Item",
      "URL",
      "Hook Note",
      "Re-hook Note",
      "CTA Note",
      "Date Added",
      ...TIMESTAMP_HEADERS,
    ],
    rows,
  };
}

async function buildResearchSnapshotsTab(
  supabase: SupabaseClient,
  brand: Brand,
  snapshotLinks: Map<string, string>,
): Promise<Tab> {
  const contentTitles = await contentTitleMap(supabase, brand);
  const { data } = await supabase
    .from("research_snapshots")
    .select(
      "id, content_id, snapshot_date, summary, youtube_data, reddit_data, quora_data, created_at, updated_at",
    )
    .eq("brand", brand);

  const rows: Row[] = (data ?? []).map((r) => [
    contentTitles.get(r.content_id) ?? r.content_id,
    r.snapshot_date,
    r.summary,
    sourceCount(r.youtube_data),
    sourceCount(r.reddit_data),
    sourceCount(r.quora_data),
    snapshotLinks.get(r.id) ?? "",
    r.created_at,
    r.updated_at,
  ]);

  return {
    title: "Research Snapshots",
    headers: [
      "Content Item",
      "Snapshot Date",
      "Summary",
      "YouTube Count",
      "Reddit Count",
      "Quora Count",
      "Full Detail Link",
      ...TIMESTAMP_HEADERS,
    ],
    rows,
  };
}

async function buildWeeklyReviewsTab(supabase: SupabaseClient, brand: Brand): Promise<Tab> {
  const { data } = await supabase
    .from("weekly_reviews")
    .select(
      "week_start_date, week_end_date, posted_as_planned, pillar_balance_notes, retention_drop_patterns, hook_library_insights, earned_click_updates, next_week_adjustment, created_at, updated_at",
    )
    .eq("brand", brand)
    .order("week_start_date", { ascending: false });

  const rows: Row[] = (data ?? []).map((r) => [
    r.week_start_date,
    r.week_end_date,
    r.posted_as_planned,
    r.pillar_balance_notes,
    r.retention_drop_patterns,
    r.hook_library_insights,
    r.earned_click_updates,
    r.next_week_adjustment,
    r.created_at,
    r.updated_at,
  ]);

  return {
    title: "Weekly Reviews",
    headers: [
      "Week Start",
      "Week End",
      "Posted As Planned",
      "Pillar Balance Notes",
      "Retention Drop Patterns",
      "Hook Library Insights",
      "Earned Click Updates",
      "Next Week Adjustment",
      ...TIMESTAMP_HEADERS,
    ],
    rows,
  };
}

async function buildCompetitorsTab(supabase: SupabaseClient, brand: Brand): Promise<Tab> {
  const { data } = await supabase
    .from("competitors")
    .select("name, platform, profile_url, notes, created_at, updated_at")
    .eq("brand", brand);

  const rows: Row[] = (data ?? []).map((r) => [
    r.name,
    r.platform,
    r.profile_url,
    r.notes,
    r.created_at,
    r.updated_at,
  ]);

  return {
    title: "Competitors",
    headers: ["Name", "Platform", "Profile URL", "Notes", ...TIMESTAMP_HEADERS],
    rows,
  };
}

async function buildCompetitorBenchmarksTab(supabase: SupabaseClient, brand: Brand): Promise<Tab> {
  const contentTitles = await contentTitleMap(supabase, brand);
  const { data } = await supabase
    .from("competitor_benchmarks")
    .select("content_id, competitor_name, platform, url, why_benchmark, created_at, updated_at")
    .eq("brand", brand);

  const rows: Row[] = (data ?? []).map((r) => [
    contentTitles.get(r.content_id) ?? r.content_id,
    r.competitor_name,
    r.platform,
    r.url,
    r.why_benchmark,
    r.created_at,
    r.updated_at,
  ]);

  return {
    title: "Competitor Benchmarks",
    headers: [
      "Content Item",
      "Competitor",
      "Platform",
      "URL",
      "Why Benchmark",
      ...TIMESTAMP_HEADERS,
    ],
    rows,
  };
}

async function buildDailyStreaksTab(supabase: SupabaseClient, brand: Brand): Promise<Tab> {
  const { data } = await supabase
    .from("daily_streaks")
    .select("streak_date, walked, posted, created_at, updated_at")
    .eq("brand", brand)
    .order("streak_date", { ascending: false });

  const rows: Row[] = (data ?? []).map((r) => [
    r.streak_date,
    r.walked ? "Yes" : "No",
    r.posted ? "Yes" : "No",
    r.created_at,
    r.updated_at,
  ]);

  return {
    title: "Daily Streaks",
    headers: ["Date", WALK_STREAK_LABEL[brand].name, "Posted", ...TIMESTAMP_HEADERS],
    rows,
  };
}

// Audit finding, fixed here: platform_snapshots, custom_sub_topics,
// goals, and collaborators had zero backup coverage since creation.
// All four are flat, brand-level list tables with no nested per-item
// detail to split off to Drive, same shape as competitors/daily_streaks
// above, so Sheets-only coverage matches this file's existing division
// of labor (Drive is for content-item-linked full detail, not general
// list tables).
async function buildPlatformSnapshotsTab(supabase: SupabaseClient, brand: Brand): Promise<Tab> {
  const { data } = await supabase
    .from("platform_snapshots")
    .select("platform, follower_count, snapshot_date, created_at, updated_at")
    .eq("brand", brand)
    .order("snapshot_date", { ascending: false });

  const rows: Row[] = (data ?? []).map((r) => [
    r.platform,
    r.follower_count,
    r.snapshot_date,
    r.created_at,
    r.updated_at,
  ]);

  return {
    title: "Platform Snapshots",
    headers: ["Platform", "Follower Count", "Snapshot Date", ...TIMESTAMP_HEADERS],
    rows,
  };
}

async function buildCustomSubTopicsTab(supabase: SupabaseClient, brand: Brand): Promise<Tab> {
  const { data } = await supabase
    .from("custom_sub_topics")
    .select("pillar, sub_topic, is_archived, created_at, updated_at")
    .eq("brand", brand)
    .order("pillar", { ascending: true });

  const rows: Row[] = (data ?? []).map((r) => [
    r.pillar,
    r.sub_topic,
    r.is_archived ? "Yes" : "No",
    r.created_at,
    r.updated_at,
  ]);

  return {
    title: "Custom Sub-topics",
    headers: ["Pillar", "Sub-topic", "Archived", ...TIMESTAMP_HEADERS],
    rows,
  };
}

// current_value is stored (and meaningful) only for old target_metric-
// based rows; platform-linked goals (platform_name set) never get it
// written anymore (src/lib/goals.ts), it's resolved live at read time
// from platform_snapshots/content_calendar instead. Recomputed here the
// same way so the backed-up number is the real current one, not a
// stale/null column value.
async function buildGoalsTab(supabase: SupabaseClient, brand: Brand): Promise<Tab> {
  const [{ data: goalRows }, { data: snapshotRows }, { data: viewRows }] = await Promise.all([
    supabase
      .from("goals")
      .select(
        "goal_text, target_metric, target_value, current_value, target_date, status, platform_name, icon_slug, created_at, updated_at",
      )
      .eq("brand", brand),
    supabase
      .from("platform_snapshots")
      .select("platform, follower_count, snapshot_date")
      .eq("brand", brand)
      .order("snapshot_date", { ascending: false }),
    // docs/platform-performance-tracking.md Migration section: same
    // totalViews source swap as src/app/(app)/layout.tsx, the live
    // "Views" pseudo-goal this backed-up number has to match.
    supabase
      .from("content_platform_posts")
      .select(
        "content_id, published_at, content_platform_stats_snapshots(snapshot_date, views, likes, comments, saves, shares, reposts)",
      )
      .eq("brand", brand),
  ]);

  const latestSnapshotsByPlatform: Record<string, number> = {};
  for (const r of snapshotRows ?? []) {
    if (!(r.platform in latestSnapshotsByPlatform)) latestSnapshotsByPlatform[r.platform] = r.follower_count;
  }
  // null means nothing's been checked in anywhere yet
  // (src/lib/platform-analytics.ts); same "0 progress, not a special
  // case" reasoning as src/app/(app)/layout.tsx's identical totalViews.
  const totalViews = totalAcrossPosts((viewRows ?? []) as ContentPlatformPostWithSnapshots[]).views ?? 0;

  // resolveGoalCurrentValues only ever runs, live, on platform_name-not-
  // null rows (src/app/(app)/layout.tsx filters to those before calling
  // it); for any row it wasn't designed for it unconditionally nulls
  // current_value, which would silently blank out a legacy row's real
  // stored value here. Only resolve for platform-linked rows and pass
  // pre-redesign (platform_name null) rows through with their raw
  // stored current_value untouched, same "preserve what a superseded
  // field actually holds" rule this file follows elsewhere.
  const rawGoals = (goalRows ?? []) as unknown as (Goal & { created_at: string; updated_at: string })[];
  const resolved = resolveGoalCurrentValues(rawGoals, totalViews, latestSnapshotsByPlatform).map((g, i) =>
    rawGoals[i].platform_name === null ? rawGoals[i] : g,
  );

  const rows: Row[] = resolved.map((g, i) => [
    g.platform_name,
    g.icon_slug,
    g.status,
    g.target_value,
    g.current_value,
    g.target_date,
    g.target_metric,
    g.goal_text,
    rawGoals[i].created_at,
    rawGoals[i].updated_at,
  ]);

  return {
    title: "Goals",
    headers: [
      "Platform Name",
      "Icon Slug",
      "Status",
      "Target Value",
      "Current Value",
      "Target Date",
      "Legacy Target Metric",
      "Legacy Goal Text",
      ...TIMESTAMP_HEADERS,
    ],
    rows,
  };
}

async function buildCollaboratorsTab(supabase: SupabaseClient, brand: Brand): Promise<Tab> {
  const { data } = await supabase
    .from("collaborators")
    .select("name, platform, profile_url, status, notes, last_contact_date, created_at, updated_at")
    .eq("brand", brand)
    .order("name", { ascending: true });

  const rows: Row[] = (data ?? []).map((r) => [
    r.name,
    r.platform,
    r.profile_url,
    r.status,
    r.notes,
    r.last_contact_date,
    r.created_at,
    r.updated_at,
  ]);

  return {
    title: "Collaborators",
    headers: [
      "Name",
      "Platform",
      "Profile URL",
      "Status",
      "Notes",
      "Last Contact Date",
      ...TIMESTAMP_HEADERS,
    ],
    rows,
  };
}

type SyncResult = { ok: true } | { ok: false; error: string };

async function syncDriveOnce(brand: Brand): Promise<SyncResult & { links?: DriveLinks }> {
  const supabase = supabaseAdmin();
  try {
    const links = await syncDriveArchive(supabase, brand);
    return { ok: true, links };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function syncSheetsOnce(brand: Brand, links: DriveLinks): Promise<SyncResult> {
  const supabase = supabaseAdmin();

  try {
    const tabs = await Promise.all([
      buildJourneyLogTab(supabase, brand),
      buildIdeasTab(supabase, brand),
      buildContentCalendarTab(supabase, brand, links.contentLinks),
      buildResearchCopyVersionsTab(supabase, brand),
      buildManualWorkflowPhasesTab(supabase, brand),
      buildScriptsVersionsTab(supabase, brand),
      buildVariantsTab(supabase, brand),
      buildHookLibraryTab(supabase, brand),
      buildReferenceVideosTab(supabase, brand),
      buildResearchSnapshotsTab(supabase, brand, links.snapshotLinks),
      buildWeeklyReviewsTab(supabase, brand),
      buildCompetitorsTab(supabase, brand),
      buildCompetitorBenchmarksTab(supabase, brand),
      buildDailyStreaksTab(supabase, brand),
      buildPlatformSnapshotsTab(supabase, brand),
      buildCustomSubTopicsTab(supabase, brand),
      buildGoalsTab(supabase, brand),
      buildCollaboratorsTab(supabase, brand),
    ]);

    await writeSheetTabs(sheetIdFor(brand), tabs);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

const EMPTY_LINKS: DriveLinks = { contentLinks: new Map(), snapshotLinks: new Map() };

// Section 17: two independent layers, each retried once automatically on
// failure and logged to backup_log on its own row. Sheets still runs
// even if Drive fails, just without Full Detail Links for this run,
// one layer having a bad night shouldn't take the other down with it.
export async function runBackupSync(brand: Brand) {
  const supabase = supabaseAdmin();

  let driveResult = await syncDriveOnce(brand);
  let driveRetries = 0;
  if (!driveResult.ok) {
    driveRetries = 1;
    driveResult = await syncDriveOnce(brand);
  }
  await supabase.from("backup_log").insert({
    brand,
    layer: "drive",
    status: driveResult.ok ? "success" : "failure",
    error_message: driveResult.ok ? null : driveResult.error,
    retry_count: driveRetries,
  });

  const links = driveResult.ok && driveResult.links ? driveResult.links : EMPTY_LINKS;

  let sheetsResult = await syncSheetsOnce(brand, links);
  let sheetsRetries = 0;
  if (!sheetsResult.ok) {
    sheetsRetries = 1;
    sheetsResult = await syncSheetsOnce(brand, links);
  }
  await supabase.from("backup_log").insert({
    brand,
    layer: "sheets",
    status: sheetsResult.ok ? "success" : "failure",
    error_message: sheetsResult.ok ? null : sheetsResult.error,
    retry_count: sheetsRetries,
  });

  // Section 17.4: trims Supabase last, after Sheets has already synced
  // tonight's real (pre-archive) data. Doing this earlier would make
  // freshly-archived research snapshots show 0 sources in the Sheets
  // index tonight, even though nothing was actually lost, just
  // relocated, only trims once tonight's Drive sync actually succeeded,
  // so anything cleared here is guaranteed already duplicated fresh.
  let archiveResult: { archivedIds: string[]; errors: string[] } = { archivedIds: [], errors: [] };
  if (driveResult.ok) {
    try {
      archiveResult = await archiveIdleContent(supabase, brand);
    } catch (err) {
      archiveResult = { archivedIds: [], errors: [err instanceof Error ? err.message : String(err)] };
    }
  }

  // driveResult.links (contentLinks/snapshotLinks) is internal, Map-typed
  // plumbing consumed by syncSheetsOnce above, not JSON-safe: a raw Map
  // serializes to "{}" via JSON.stringify, which made the /api/cron/backup
  // response look like Drive linking silently produced nothing even on a
  // fully successful run. Callers (the route, the status UI) only need
  // ok/error, same shape as sheetsResult.
  const driveSummary: SyncResult = driveResult.ok ? { ok: true } : { ok: false, error: driveResult.error };

  return { drive: driveSummary, sheets: sheetsResult, archive: archiveResult };
}

export async function runBackupSyncAllBrands() {
  const results = await Promise.all(BRANDS.map((brand) => runBackupSync(brand)));
  return BRANDS.map((brand, i) => ({ brand, label: BRAND_LABELS[brand], result: results[i] }));
}
