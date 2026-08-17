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
