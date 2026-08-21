import { createClient } from "@/lib/supabase/server";
import { PILLAR_STRUCTURE, mergeCustomSubTopics, type PillarStructure } from "@/lib/pillars";
import type { Brand } from "@/lib/brand";

// Server-only (imports next/headers via the Supabase server client), kept
// out of src/lib/pillars.ts so that file stays safe to import from "use
// client" components. Every page that reads the pillar/sub-topic
// structure calls this instead of PILLAR_STRUCTURE[brand] directly, so
// custom sub-topics show up everywhere without each call site fetching
// custom_sub_topics itself.
export async function getMergedPillarStructure(brand: Brand): Promise<PillarStructure> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("custom_sub_topics")
    .select("pillar, sub_topic")
    .eq("brand", brand)
    .eq("is_archived", false);

  return mergeCustomSubTopics(PILLAR_STRUCTURE[brand], data ?? []);
}

export type CustomSubTopic = {
  id: string;
  pillar: string;
  sub_topic: string;
};

// Raw (non-merged) active custom sub-topic rows, id included. Topic Map
// uses this to know which rendered pills are custom (removable) versus
// PILLAR_STRUCTURE's locked/structural ones, and to bind the remove
// action to a specific row.
export async function listCustomSubTopics(brand: Brand): Promise<CustomSubTopic[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("custom_sub_topics")
    .select("id, pillar, sub_topic")
    .eq("brand", brand)
    .eq("is_archived", false);

  return data ?? [];
}

// How many existing items are tagged with this custom sub-topic, summed
// across every table that carries sub-topic tags (journey_log and
// competitors as arrays, content_calendar and ideas as a single value).
// Matched by brand + name only, not brand + pillar + name: those four
// tables don't all reliably keep pillar and sub_topic in sync with each
// other, and the sub-topic name is what actually appears on the tagged
// item, so name is the honest match key. Shown before archiving so
// removal is an informed choice (see docs/topic-page-redesign.md).
export async function getCustomSubTopicUsageCount(brand: Brand, subTopic: string): Promise<number> {
  const supabase = await createClient();
  const [journeyLog, contentCalendar, ideas, competitors] = await Promise.all([
    supabase
      .from("journey_log")
      .select("id", { count: "exact", head: true })
      .eq("brand", brand)
      .contains("sub_topic", [subTopic]),
    supabase
      .from("content_calendar")
      .select("id", { count: "exact", head: true })
      .eq("brand", brand)
      .eq("sub_topic", subTopic),
    supabase
      .from("ideas")
      .select("id", { count: "exact", head: true })
      .eq("brand", brand)
      .eq("sub_topic", subTopic),
    supabase
      .from("competitors")
      .select("id", { count: "exact", head: true })
      .eq("brand", brand)
      .contains("sub_topics", [subTopic]),
  ]);

  return (
    (journeyLog.count ?? 0) +
    (contentCalendar.count ?? 0) +
    (ideas.count ?? 0) +
    (competitors.count ?? 0)
  );
}
