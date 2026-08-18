import type { Brand } from "@/lib/brand";

// Hand-written subset of content_calendar's columns, just the fields the
// UI touches so far. Expand as later chunks build out more of the topic
// page (see supabase/migrations/0001_init.sql for the full schema).
export type ProductionStatus =
  | "Idea"
  | "Scripting"
  | "Filming"
  | "Editing"
  | "Scheduled"
  | "Published";

export type ViabilityStatus =
  | "Ready"
  | "Waiting for Evidence"
  | "Needs More Time"
  | "On Hold";

export const PRODUCTION_STATUSES: ProductionStatus[] = [
  "Idea",
  "Scripting",
  "Filming",
  "Editing",
  "Scheduled",
  "Published",
];

export const VIABILITY_STATUSES: ViabilityStatus[] = [
  "Ready",
  "Waiting for Evidence",
  "Needs More Time",
  "On Hold",
];

export type ContentCalendarItem = {
  id: string;
  brand: Brand;
  final_title: string | null;
  production_status: ProductionStatus;
  viability_status: ViabilityStatus;
  viability_reason_note: string | null;
  pillar: string | null;
  sub_topic: string | null;
  format: string | null;
  publish_date: string | null;
  is_archived: boolean;
};

export const FORMATS = [
  "Reel",
  "Short",
  "Long Video",
  "Post",
  "Thread",
  "Story",
  "Other",
] as const;

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

// Section 8: Idea Panel
export const IDEA_STATUSES = ["Idea", "Research", "Ready to work"] as const;

export type Idea = {
  id: string;
  brand: Brand;
  idea_title: string;
  pillar: string | null;
  sub_topic: string | null;
  format: string | null;
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
  retention_drop_timestamp: string | null;
  retention_drop_note: string | null;
  earned_the_click: string | null;
  earned_click_note: string | null;
  derived_from_content_id: string | null;

  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  conversions: number | null;

  final_description: string | null;
  plain_keyword_tags: string[] | null;
  question_style_tags: string[] | null;
  core_tags: string[] | null;
  detailed_viewer_search_phrase_tags: string[] | null;
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
export type ContentArchiveCompanion = {
  full_script: string | null;
  main_pointers: MainPoint[];
  title_variants: NonLiveVariant[];
  hook_variants: NonLiveVariant[];
  thumbnail_variants: NonLiveThumbnailVariant[];
  reference_videos: { id: string; hook_note: string | null; rehook_note: string | null; cta_note: string | null }[];
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

export type PlatformPublishingEntry = {
  platform_title?: string;
  platform_description?: string;
  platform_tags_hashtags?: string;
  platform_angle_line?: string;
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

export type Goal = {
  id: string;
  brand: Brand;
  goal_text: string;
  target_metric: string | null;
  target_value: number | null;
  current_value: number | null;
  target_date: string | null;
  status: string;
};
