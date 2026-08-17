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
