import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";
import { PILLAR_STRUCTURE } from "@/lib/pillars";
import { Button } from "@/components/ui/button";
import { PillarTree, type TreeTopic } from "@/components/pillar-tree";
import { moveSequenceItem } from "./actions";

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

async function PillarTreeView({ brand }: { brand: string }) {
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
    <PillarTree structure={PILLAR_STRUCTURE[brand as "lbstransformation"]} topicsByBranch={topicsByBranch} />
  );
}

async function SequenceView({ brand }: { brand: string }) {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("content_calendar")
    .select("id, final_title, sequence_step, sequence_order_custom, viability_status, viability_reason_note, evidence_condition")
    .eq("brand", brand)
    .not("sequence_step", "is", null)
    .order("sequence_order_custom", { ascending: true, nullsFirst: false })
    .order("sequence_step", { ascending: true });

  const items = rows ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-sm text-muted-foreground">
        Planned V1 to V8 sequence, reorderable, not a hard lock. You can record and publish
        out of order any time.
      </p>
      <ul className="mt-4 space-y-2">
        {items.map((item, i) => (
          <li key={item.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
            <div className="flex shrink-0 flex-col gap-1">
              <form action={moveSequenceItem.bind(null, item.id, "up")}>
                <button type="submit" disabled={i === 0} className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30">
                  &#9650;
                </button>
              </form>
              <form action={moveSequenceItem.bind(null, item.id, "down")}>
                <button type="submit" disabled={i === items.length - 1} className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30">
                  &#9660;
                </button>
              </form>
            </div>
            <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-xs font-medium">
              {item.sequence_step}
            </span>
            <div className="min-w-0 flex-1">
              <Link href={`/calendar/${item.id}`} className="truncate text-sm font-medium hover:underline">
                {item.final_title || "Untitled"}
              </Link>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{item.viability_status}</span>
                {item.evidence_condition && <span>&middot; {item.evidence_condition}</span>}
              </div>
            </div>
          </li>
        ))}
        {items.length === 0 && (
          <li className="rounded-lg border border-border px-3 py-6 text-center text-sm text-muted-foreground">
            No sequence steps set yet. Give a Content Calendar item a Sequence Step (V1,
            V2, ...) in its System &amp; Production section to see it here.
          </li>
        )}
      </ul>
    </div>
  );
}

export default async function PillarTreeOrSequencePage() {
  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  const isTree = brand === "lbstransformation";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold">{isTree ? "Pillar Tree" : "Sequence View"}</h1>
      {isTree ? (
        <p className="mt-1 text-sm text-muted-foreground">
          Body, Mind, Soul. Tap a branch to see its topics, tap a leaf to open one directly.
        </p>
      ) : null}

      <div className="mt-8">{isTree ? <PillarTreeView brand={brand} /> : <SequenceView brand={brand} />}</div>

      {!isTree && (
        <p className="mt-8 text-center text-xs text-muted-foreground">
          <Button asChild variant="link" size="sm">
            <Link href="/calendar">Manage full topic details in Content Calendar &rarr;</Link>
          </Button>
        </p>
      )}
    </div>
  );
}
