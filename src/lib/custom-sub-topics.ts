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
