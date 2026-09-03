import type { Brand } from "@/lib/brand";

// Hand-written subset of content_calendar's columns, just the fields the
// UI touches so far. Expand as later chunks build out more of the topic
// page (see supabase/migrations/0001_init.sql for the full schema).
export type ProductionStatus =
  | "Ready to Record / Scripted"
  | "Recorded"
  | "Editing"
  | "Published / Scheduled";

export type ViabilityStatus =
  | "Ready"
  | "Waiting for Evidence"
  | "Needs More Time"
  | "On Hold";

export const PRODUCTION_STATUSES: ProductionStatus[] = [
  "Ready to Record / Scripted",
  "Recorded",
  "Editing",
  "Published / Scheduled",
];

export type ContentCalendarItem = {
  id: string;
  brand: Brand;
  final_title: string | null;
  production_status: ProductionStatus | null;
  // Viability Status/Reason retired from the UI (2026-08-27): Production
  // Status already conveys workability, this was redundant. Column and
  // type stay for the archive/backup exports (markdown-archive.ts,
  // backup.ts) that still read a content item's last-known value; nothing
  // edits it anymore, so it's frozen at whatever each item already had.
  viability_status: ViabilityStatus;
  viability_reason_note: string | null;
  pillar: string | null;
  sub_topic: string | null;
  format: string | null;
  publish_date: string | null;
  is_archived: boolean;
};

export const TARGET_STAGES = ["Awareness", "Consideration", "Decision"] as const;

export const TONE_STYLES = [
  "Friendly / Big Brother",
  "Direct / No-BS",
  "Calm / Meditative",
  "Energetic / Motivational",
  "Story-driven",
  "Teaching / Explainer",
] as const;

export const IDEA_SOURCES = ["Comment", "DM", "Mind", "Competitor", "Internet"] as const;

// The Format picker's option pair, narrowed to Short / Long (the label
// for "Long Video" is just "Long"). Lives here, not in
// format-platform-fields.tsx, because that's a "use client" module and a
// Server Component (ideas/page.tsx) needs this constant too: importing a
// plain value from a client module into an RSC gets the client-reference
// stub, not the array. Shared by format-platform-fields.tsx and
// idea-format-platform-fields.tsx so the two never drift into separately
// hardcoded lists.
export const CONTENT_FORMAT_OPTIONS: { value: string; label: string }[] = [
  { value: "Short", label: "Short" },
  { value: "Long Video", label: "Long" },
];

// Section 8: Idea Panel
export const IDEA_STATUSES = ["Idea", "Research", "Ready to work"] as const;

export type Idea = {
  id: string;
  brand: Brand;
  idea_title: string;
  pillar: string | null;
  sub_topic: string | null;
  format: string | null;
  // Idea Panel format field (2026-08-27): supabase/migrations/0022_ideas_platform.sql.
  platform: string[];
  brief_description: string | null;
  reference_url: string | null;
  idea_source: string | null;
  source_detail: string | null;
  status: string;
  migrated_to_content_id: string | null;
};

export type ChecklistItem = { label: string; checked: boolean };

// Full row shape for the topic page (10.1.1 + 10.1.2 fields added this
// chunk). The trimmed ContentCalendarItem above stays as-is for the list
// view, which only ever selects that smaller column set.
export type ContentCalendarDetail = ContentCalendarItem & {
  raw_idea_title: string | null;
  raw_keywords_topics: string | null;
  brief_intent: string | null;
  content_angle_hook_direction: string | null;
  reference_inspiration: string | null;
  target_stage_viewer_journey: string | null;
  my_angle_unique_pov: string | null;
  proof_credibility: string | null;
  tone_style: string | null;
  idea_source: string | null;
  source_detail: string | null;

  viewer_problem: string | null;
  promise_outcome: string | null;
  final_title_hook: string | null;
  viewer_keywords_search_phrases: string | null;
  viewer_description: string | null;
  primary_emotion_pain_point: string | null;
  objections_doubts: string[] | null;
  desired_action_cta: string | null;
  completeness_checklist: ChecklistItem[] | null;
  format_recommendation: string | null;

  main_pointers: MainPoint[] | null;
  energy_tag: string | null;
  full_script: string | null;
  voice_memo_transcript: string | null;

  platform_publishing: PlatformPublishing | null;

  sequence_step: string | null;
  sequence_order_custom: number | null;
  evidence_condition: string | null;
  script_outline_link: string | null;
  published_url: string | null;
  performance_notes: string | null;
  series_playlist: string | null;
  search_demand_trend_signal: string | null;
  success_metric_focus: string | null;
  follow_up_content_ideas: string[] | null;
  analytics_review_date: string | null;
  earned_the_click: string | null;
  earned_click_note: string | null;
  derived_from_content_id: string | null;

  conversions: number | null;

  final_description: string | null;
  plain_keyword_tags: string[] | null;
  question_style_tags: string[] | null;
  core_tags: string[] | null;
  detailed_viewer_search_phrase_tags: string[] | null;

  // "Posted on" for Short and Long Video items (format-platform-fields.tsx),
  // always [] for any other format, not surfaced anywhere until this field.
  platform: string[] | null;

  printable_marketing_hooks: PrintableMarketingHooks | null;
};

// docs/topic-page-redesign.md Section 2, Tab 1 "Research & Copy":
// replaces the old research_snapshots-driven Run Research pipeline. One
// current pass, regenerated wholesale on each Run, no history. Source
// containers are dynamic (whatever sources actually surfaced something
// useful get one, not fixed to Google/Reddit/Quora), each with its own
// collapsible sources sub-section, distinct from the one global
// sources list under the summary.
export type ResearchSource = { title: string; url: string };

export type ResearchCopyContainer = {
  type: "discussion" | "article";
  sourceName: string;
  items: string[] | null;
  articleSummary: string | null;
  sources: ResearchSource[];
};

export type ResearchCopyResult = {
  summary: string;
  globalSources: ResearchSource[];
  titles: string[];
  description: string;
  keywordTags: string[];
  questionTags: string[];
  containers: ResearchCopyContainer[];
  generatedAt: string;
};

// Manual (pasted) and AI (Run) research coexist per content item instead
// of one overwriting the other (supabase/migrations/0015_research_copy_scripts_versions.sql),
// mirroring the title_variants/hook_variants/thumbnail_variants is_live
// pattern: one row per source, is_live marks which one currently feeds
// downstream consumers (Scripts' Run input, specifically), a partial
// unique index enforces at most one live row per content item. Unlike
// those tables, at most one row per (content_id, source) too, "Run"
// still only ever overwrites the AI row, "Paste from AI chat" still
// only ever overwrites the Manual row.
export type VersionSource = "manual" | "ai";

export type ResearchCopyVersion = {
  id: string;
  source: VersionSource;
  data: ResearchCopyResult;
  is_live: boolean;
};

// Run now runs as 3 separate Claude calls sharing one web search pass
// (summary, sources & containers, titles/description/tags), each with its
// own token budget since content length genuinely varies by topic and no
// single fixed budget survives every topic. This tracks live per-step
// status, polled from the tab while Run is pending, so progress is real
// and visible instead of one long silent wait. Overwritten each Run, no
// history, same convention as research_copy itself.
export type ResearchStep = "summary" | "sources" | "copy";
export type StepStatus = "pending" | "running" | "done" | "error";

export type ResearchProgress = {
  status: "idle" | "running" | "done" | "error";
  steps: Record<ResearchStep, StepStatus>;
  error: string | null;
  updatedAt: string;
};

// docs/topic-page-redesign.md Section 2, Tab 2 "Scripts": one Run
// produces the full package for the topic, not a branch on the item's
// own format field. hooks + painPointAnswer are the long-form script's
// opening (the answer/relief line goes right after whichever hook gets
// used, placed early on purpose, not buried after buildup), longFormScript
// is the main body with its own ctaOptions at the end (the one piece in
// this package that's a complete, read-it-as-written script, unlike the
// pointer-style pieces below), shortFormPointers condenses the same core
// topic into a single pointer-style pass (main points + brief
// explanation each, not full prose, a CTA there is just one more point
// to ad-lib, not a dedicated field), and atomizedShorts breaks the
// long-form content into however many genuinely standalone shorts it
// actually supports, each with its own small pointer script, same
// reasoning, no dedicated CTA field per short.
export type ScriptPointer = { point: string; explanation: string };

export type AtomizedShort = {
  title: string;
  pointerScript: ScriptPointer[];
};

// Scripting hook categorization (2026-08-27): one hook per delivery
// mode, matching Manual Packaging's own visual/textual/verbal
// categories (HOOK_LIBRARY_TYPES below), not 3 interchangeable opening
// lines. "textual" here on purpose, not "text": HookLibraryType's own
// value is "text" (hook_variants.hook_type's check constraint), keep
// them visually distinct so a callsite mapping ScriptHooks -> a
// HookLibraryType is never a silent no-op string match.
export type ScriptHooks = { visual: string; textual: string; verbal: string };

// Archive/backup exports (backup.ts, markdown-archive.ts) are the only
// two places that need to read either shape: real scripts_versions rows
// saved before this categorization (2026-08-27) still have the old flat
// string[] on disk, nothing rewrites historical data. Every other
// consumer in the app only ever reads freshly-generated data, already
// in the ScriptHooks shape.
export function formatScriptHooks(hooks: ScriptHooks | string[]): string {
  if (Array.isArray(hooks)) return hooks.join("; ");
  return `Visual: ${hooks.visual}; Textual: ${hooks.textual}; Verbal: ${hooks.verbal}`;
}

export type ScriptsResult = {
  hooks: ScriptHooks;
  painPointAnswer: string;
  longFormScript: string;
  ctaOptions: string[];
  shortFormPointers: ScriptPointer[];
  atomizedShorts: AtomizedShort[];
  generatedAt: string;
};

// Same Manual/AI coexistence as ResearchCopyVersion above, independent
// active flag from research_copy_versions, Research & Copy and Scripts
// are separate concerns (you could have Manual active for research and
// AI active for scripts on the same item).
export type ScriptsVersion = {
  id: string;
  source: VersionSource;
  data: ScriptsResult;
  is_live: boolean;
};

// docs/manual-workflow-redesign.md: the Manual side's three-phase
// Research -> Packaging -> Scripting workflow (supabase/migrations/
// 0017_manual_workflow_phases.sql), replacing the old two-part Manual
// structure that used to live inside Research & Copy/Scripts
// (ResearchCopyVersion/ScriptsVersion, source==="manual"). One row per
// (content_id, phase), phase-gated: Packaging requires a Research row
// with parsed_data set, Scripting requires the same of Packaging.
export const MANUAL_WORKFLOW_PHASES = ["research", "packaging", "scripting"] as const;
export type ManualWorkflowPhase = (typeof MANUAL_WORKFLOW_PHASES)[number];

// The template's own end-of-phase line. Packaging's template has no
// equivalent (approval there happens by the user typing the next-phase
// instruction, not a parsed field), so packaging rows leave this null.
export type ManualWorkflowStatus = "approved" | "needs_revision" | "rejected";

// parsed_data's shape is phase-specific (ResearchPhaseData /
// PackagingPhaseData / ScriptingPhaseData, each defined alongside that
// phase's own parser as it's built), unknown for now since nothing
// parses it yet, Phase A only needs to gate on whether it's set.
export type ManualWorkflowPhaseRow = {
  id: string;
  phase: ManualWorkflowPhase;
  raw_pasted_text: string | null;
  parsed_data: unknown | null;
  status: ManualWorkflowStatus | null;
};

// Section 10.2.2/10.2.3: Research Snapshots (append-only, latest drives
// Potential Data, all rows together drive History)
export type YouTubeVideoSignal = {
  videoId: string;
  title: string;
  channelTitle: string;
  viewCount: number | null;
  publishedAt: string;
  url: string;
  description: string;
  topComments: string[];
  transcriptAvailable: boolean;
};

export type GoogleSearchSignal = {
  autocomplete: string[];
  peopleAlsoAsk: { question: string; snippet: string | null; link: string | null }[];
  relatedSearches: string[];
};

export type WebSearchResult = { title: string; link: string; snippet: string | null };

export type ResearchSnapshot = {
  id: string;
  content_id: string;
  snapshot_date: string;
  youtube_data: YouTubeVideoSignal[] | null;
  google_data: GoogleSearchSignal | null;
  reddit_data: WebSearchResult[] | null;
  quora_data: WebSearchResult[] | null;
  summary: string | null;
  deep_research_data: DeepResearchResult | null;
};

// Section 19 Scout/Deep Research flow: a second, deeper pass beyond the
// initial Run Research/Refresh Research pull, run on-demand against that
// pull's already-fetched raw data (no re-fetch). Unlike the public
// Viewer POV/Normal POV copy, privateDescription is explicitly
// creator-facing only, never shown to viewers, and can draw on general
// knowledge beyond what the search results themselves contain.
export type DeepResearchResult = {
  titles: string[];
  privateDescription: string;
  shortTags: string[];
  questionTags: string[];
  formatFit: "short" | "long" | "both";
  formatReason: string;
  shortPointerVersion: string | null;
  longFormFocus: string | null;
  topGoogleSearches: string[];
  topGoogleAutofill: string[];
  topYoutubeAutofill: string[];
  redditQuoraPainPoints: string[];
  redditQuoraAnswers: string[];
  redditQuoraSuggestions: string[];
  confidenceNote: string | null;
};

// Section 19: "Printable / Marketing" deep-dive, delivery-mode hooks
// (what's shown/said in the first few seconds), distinct from and
// coexisting with the Title/Hook variants system (which competes on
// framing, not delivery mode). Generation UI is gone (lived on the now-
// removed /research subpage, docs/topic-page-redesign.md), field stays
// schema-only for any existing data.
export type PrintableMarketingHooks = {
  visual: string;
  text: string;
  verbal: string;
  generated_at: string;
};

// Standalone Hook Library (coexists with the real-usage aggregation on
// the same page): a swipe-file of delivery-mode hook examples, imported
// from CSV/JSON or entered directly, independent of any one content
// item. Same visual/text/verbal delivery-mode axis as
// PrintableMarketingHooks above, but many entries per type instead of
// one triplet per topic.
export const HOOK_LIBRARY_TYPES = ["visual", "text", "verbal"] as const;
export type HookLibraryType = (typeof HOOK_LIBRARY_TYPES)[number];

export type HookLibraryEntry = {
  id: string;
  brand: Brand;
  type: HookLibraryType;
  content: string;
};

// docs/topic-page-redesign.md (Notes section): per-item freeform notes,
// one list per content_calendar row (supabase/migrations/
// 0026_content_notes.sql). title is optional; the collapsed card summary
// falls back to a snippet of content, then "Untitled note". Ordered
// newest-first by updated_at (created and edited both bump it).
export type ContentNote = {
  id: string;
  title: string | null;
  content: string;
  created_at: string;
  updated_at: string;
};

// Section 10.2.1: Reference Videos Tab
export type ReferenceVideo = {
  id: string;
  content_id: string;
  url: string;
  hook_note: string | null;
  rehook_note: string | null;
  cta_note: string | null;
  date_added: string;
};

// Section 17.4: Hot/Cold Archiving. Machine-readable Drive companions to
// the human-readable .md files, the retrieve path restores from these
// rather than re-parsing prose Markdown.
//
// research_copy_versions/scripts_versions: added as a real backup audit
// finding, not an archive-lifecycle need, unlike every other field on
// this type, archiveOneItem never clears these two tables (see
// archive-lifecycle.ts), they stay live in Supabase regardless of a
// content item's archived status. They're included here anyway so a
// structured, machine-readable copy exists somewhere other than
// Supabase itself, the prose Markdown file carries the human-readable
// version of the same data (see buildContentCalendarMarkdown). Both
// Manual and AI versions, whichever exist, is_live marks which one
// currently feeds downstream consumers.
export type ContentArchiveCompanion = {
  full_script: string | null;
  main_pointers: MainPoint[];
  title_variants: NonLiveVariant[];
  hook_variants: NonLiveVariant[];
  thumbnail_variants: NonLiveThumbnailVariant[];
  reference_videos: { id: string; hook_note: string | null; rehook_note: string | null; cta_note: string | null }[];
  research_copy_versions: { source: VersionSource; is_live: boolean; data: ResearchCopyResult }[];
  scripts_versions: { source: VersionSource; is_live: boolean; data: ScriptsResult }[];
};

export type NonLiveVariant = {
  variant_text: string;
  rank: number | null;
  source: string;
  performance_rating: number | null;
};

export type NonLiveThumbnailVariant = {
  concept: string | null;
  main_text_on_image: string | null;
  visual_elements: string | null;
  emotion_vibe: string | null;
  rank: number | null;
  source: string;
  performance_rating: number | null;
};

export type ResearchArchiveCompanion = {
  youtube_data: YouTubeVideoSignal[] | null;
  google_data: GoogleSearchSignal | null;
  reddit_data: WebSearchResult[] | null;
  quora_data: WebSearchResult[] | null;
};

// Section 10.1.3: Research Output
export type TextVariant = {
  id: string;
  variant_text: string;
  rank: number | null;
  source: string;
  performance_rating: number | null;
  is_live: boolean;
};

export type ThumbnailVariant = {
  id: string;
  concept: string | null;
  main_text_on_image: string | null;
  visual_elements: string | null;
  emotion_vibe: string | null;
  rank: number | null;
  source: string;
  performance_rating: number | null;
  is_live: boolean;
};

export const SUCCESS_METRIC_FOCUS_OPTIONS = [
  "Reach",
  "Engagement",
  "Retention",
  "Conversion",
] as const;

export const EARNED_THE_CLICK_OPTIONS = ["Yes", "No", "Unsure"] as const;

// Section 7: My Journey Log
export const MOOD_ENERGY_OPTIONS = ["Low", "Medium", "High"] as const;

export type JourneyEntry = {
  id: string;
  brand: Brand;
  entry_date: string;
  pillar_focus: string[];
  sub_topic: string[];
  what_i_did_experienced: string | null;
  key_lesson_insight: string | null;
  proof_results: string | null;
  mood_energy: string | null;
  tags_keywords: string | null;
  angle_worthy: boolean;
};

export const PLATFORMS = ["YouTube", "Instagram", "TikTok", "Threads", "Facebook"] as const;

// Section 10.1.4, restructured: two parallel modes per platform rather
// than one set of fields. Viewer POV is the algorithm/platform-optimized
// version (SEO title, description, short + question-style keywords,
// tuned to that platform's current discovery patterns); Normal POV is
// the plain, direct version of the same fields with no algorithm
// framing. Both are meant to be fully ready-to-paste on their own.
export type PlatformModeEntry = {
  title?: string;
  description?: string;
  short_keywords?: string;
  question_keywords?: string;
  angle_line?: string;
};

export type PlatformPublishingEntry = {
  viewer_pov: PlatformModeEntry;
  normal_pov: PlatformModeEntry;
};

export type PlatformPublishing = Record<string, PlatformPublishingEntry>;

export type MainPoint = {
  point_text: string;
  landing_line: string | null;
  runtime_estimate_seconds: number | null;
};

export const ENERGY_TAG_PRESETS = ["Calm", "Direct", "High Energy"] as const;

// Section 14: Competitors
export type Competitor = {
  id: string;
  brand: Brand;
  name: string;
  platform: string | null;
  profile_url: string | null;
  notes: string | null;
  active: boolean;
  sub_topics: string[];
};

// Section 10.1.6: Competitor Benchmarks (per content item)
export type CompetitorBenchmark = {
  id: string;
  competitor_id: string | null;
  competitor_name: string | null;
  platform: string | null;
  url: string | null;
  why_benchmark: string | null;
  notes: string | null;
};

// Section 14.3: Collaboration & Outreach Tracker
export const COLLABORATOR_STATUSES = [
  "Identified",
  "Reached Out",
  "In Talks",
  "Collaborated",
  "Not a Fit",
] as const;

export type Collaborator = {
  id: string;
  brand: Brand;
  name: string;
  platform: string | null;
  profile_url: string | null;
  status: string;
  notes: string | null;
  last_contact_date: string | null;
};

// Section 6.5: Goals & Milestones
export const TARGET_METRIC_OPTIONS = [
  "Subscribers/Followers",
  "Views",
  "Revenue",
  "Community Members",
  "Custom",
] as const;

export const GOAL_STATUSES = ["On Track", "Behind", "Achieved", "Abandoned"] as const;

// Streak & Goals redesign: platform_name (freeform, any platform, not
// TARGET_METRIC_OPTIONS above) is the new display label going forward.
// target_metric stays for old rows only, superseded, no UI reads or
// writes it anymore, see supabase/migrations/0013_platform_goals.sql.
// icon_slug is a src/lib/platform-icons.ts Simple Icons slug; icon_url
// is unused for now, schema-ready for an upload path added later.
export type Goal = {
  id: string;
  brand: Brand;
  goal_text: string;
  target_metric: string | null;
  target_value: number | null;
  current_value: number | null;
  target_date: string | null;
  status: string;
  platform_name: string | null;
  icon_slug: string | null;
  icon_url: string | null;
  // GROUP J: external account id for API auto-sync (YouTube channel id
  // or @handle today). Null for platforms with no auto-sync.
  source_ref: string | null;
};

// docs/platform-performance-tracking.md Section 2:
// supabase/migrations/0018_content_platform_posts.sql. One row per
// platform a content item was actually posted to; snapshots is the
// embedded content_platform_stats_snapshots child collection (Supabase
// FK embed, same pattern competitors/page.tsx already uses in reverse),
// one row per check-in, repeatable over time.
// Analytics audit (2026-08-27) Phase 3: retention_drop_timestamp/note
// moved here, one reading per check-in, from content_calendar's old
// one-per-item fields (never had a UI setter after topic-page-redesign.md
// Section 9, stays there unused) and from content_platform_posts' own
// retention_drop_note (0018_content_platform_posts.sql, never had a
// write path at all, dropped in 0020_retention_drop_check_ins.sql
// rather than compete with this, the real version).
export type ContentPlatformStatsSnapshot = {
  snapshot_date: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  saves: number | null;
  shares: number | null;
  reposts: number | null;
  retention_drop_timestamp: string | null;
  retention_drop_note: string | null;
};

export type ContentPlatformPost = {
  id: string;
  platform: string;
  published_at: string;
  // GROUP I: the pasted post URL, only meaningfully used for YouTube
  // today (auto-refresh parses a video id out of it), generic per this
  // project's build-full-schemas-upfront convention. Null until pasted.
  post_url: string | null;
  content_platform_stats_snapshots: ContentPlatformStatsSnapshot[];
};

// Section 13: Quick Capture
export const QUICK_CAPTURE_CONTENT_TYPES = ["Competitor", "Inspiration", "Trend", "Other"] as const;
export const QUICK_CAPTURE_STATUSES = ["Inbox", "Reviewed", "Migrated"] as const;

export type QuickCapture = {
  id: string;
  brand: Brand;
  url: string;
  pillar: string | null;
  quick_hook_notes: string | null;
  quick_rehook_notes: string | null;
  quick_cta_notes: string | null;
  content_type: string | null;
  competitor_name: string | null;
  status: string;
};

// Section 12: Weekly Review
export type WeeklyReview = {
  id: string;
  brand: Brand;
  week_start_date: string;
  week_end_date: string;
  posted_as_planned: string | null;
  pillar_balance_notes: string | null;
  retention_drop_patterns: string | null;
  hook_library_insights: string | null;
  earned_click_updates: string | null;
  next_week_adjustment: string | null;
};

// Section 11: Hook Library. Aggregated from whichever variant is
// is_live on each content item, not a table of its own.
export type LiveVariantAggregate = {
  variant_text: string;
  uses: number;
  avgPerformanceRating: number | null;
};
