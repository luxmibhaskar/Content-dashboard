import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";
import { PILLAR_STRUCTURE } from "@/lib/pillars";
import { PillarTree, type TreeTopic } from "@/components/pillar-tree";

function devScoreOf(row: {
  my_angle_unique_pov: string | null;
  raw_idea_title: string | null;
  production_status: string;
}) {
  let score = 0;
  if (row.raw_idea_title) score += 0.5;
  if (row.my_angle_unique_pov) score += 0.5;
  return Math.min(1, score);
}

export default async function PillarTreePage() {
  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("content_calendar")
    .select("id, final_title, sub_topic, is_locked, unlock_condition, my_angle_unique_pov, raw_idea_title, production_status")
    .eq("brand", brand)
    .not("sub_topic", "is", null);

  const topicsByBranch: Record<string, TreeTopic[]> = {};
  for (const r of rows ?? []) {
    if (!r.sub_topic) continue;
    const list = topicsByBranch[r.sub_topic] ?? [];
    list.push({
      id: r.id,
      final_title: r.final_title,
      is_locked: r.is_locked,
      unlock_condition: r.unlock_condition,
      devScore: devScoreOf(r),
    });
    topicsByBranch[r.sub_topic] = list;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Pillar Tree</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tap a branch to see its topics, tap a leaf to open one directly.
      </p>

      <div className="mt-8">
        <PillarTree structure={PILLAR_STRUCTURE[brand]} topicsByBranch={topicsByBranch} />
      </div>
    </div>
  );
}
