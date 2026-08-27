import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";
import { pillarsFor } from "@/lib/pillars";
import { getMergedPillarStructure } from "@/lib/custom-sub-topics";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/glow-card";
import { createJourneyEntry } from "./actions";
import type { JourneyEntry } from "@/lib/types";

export default async function JourneyLogPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    pillar?: string;
    sub_topic?: string;
    q?: string;
    angle_worthy?: string;
  }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  const supabase = await createClient();
  const structure = await getMergedPillarStructure(brand);

  let query = supabase
    .from("journey_log")
    .select(
      "id, brand, entry_date, pillar_focus, sub_topic, what_i_did_experienced, key_lesson_insight, tags_keywords, angle_worthy",
    )
    .eq("brand", brand)
    .order("entry_date", { ascending: false });

  if (params.from) query = query.gte("entry_date", params.from);
  if (params.to) query = query.lte("entry_date", params.to);
  if (params.pillar) query = query.contains("pillar_focus", [params.pillar]);
  if (params.sub_topic) query = query.contains("sub_topic", [params.sub_topic]);
  if (params.angle_worthy) query = query.eq("angle_worthy", true);
  if (params.q) {
    const term = `%${params.q}%`;
    query = query.or(
      `what_i_did_experienced.ilike.${term},key_lesson_insight.ilike.${term},tags_keywords.ilike.${term}`,
    );
  }

  const { data: entries } = await query;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Journey Log</h1>
        <form action={createJourneyEntry}>
          <Button type="submit" size="sm">
            + New Entry
          </Button>
        </form>
      </div>

      <form method="get" action="/journey" className="mt-4 flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="from">
            From
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={params.from}
            className="h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="to">
            To
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={params.to}
            className="h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="pillar">
            Pillar
          </label>
          <select
            id="pillar"
            name="pillar"
            defaultValue={params.pillar ?? ""}
            className="h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
          >
            <option value="">All</option>
            {pillarsFor(brand).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="sub_topic">
            Sub-topic
          </label>
          <select
            id="sub_topic"
            name="sub_topic"
            defaultValue={params.sub_topic ?? ""}
            className="h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
          >
            <option value="">All</option>
            {Object.values(structure).flat().map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="q">
            Keyword
          </label>
          <input
            id="q"
            name="q"
            type="text"
            defaultValue={params.q}
            placeholder="search..."
            className="h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
          />
        </div>
        {/* docs/topic-page-redesign.md Section 3: Personal Angle Bank is
            this toggle now, not a separate page, "your best lived-
            experience angles" is just this same list filtered down. */}
        <label className="flex items-center gap-1.5 pb-1.5 text-sm text-muted-foreground">
          <input
            type="checkbox"
            name="angle_worthy"
            value="1"
            defaultChecked={Boolean(params.angle_worthy)}
            className="size-3.5 rounded border-input"
          />
          Angle-worthy only
        </label>
        <Button type="submit" size="sm" variant="outline">
          Filter
        </Button>
        {(params.from || params.to || params.pillar || params.sub_topic || params.q || params.angle_worthy) && (
          <Link href="/journey" className="text-xs text-muted-foreground hover:underline">
            Clear filters
          </Link>
        )}
      </form>

      <GlowCard neutral className="mt-6 divide-y divide-border">
        {(entries as JourneyEntry[] | null)?.map((entry) => (
          <div key={entry.id}>
            <Link
              href={`/journey/${entry.id}`}
              className="flex items-center justify-between gap-4 px-3 py-2.5 hover:bg-muted/30"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{entry.entry_date}</span>
                  {entry.angle_worthy && <span title="Angle-worthy">&#9733;</span>}
                  {[...entry.pillar_focus, ...entry.sub_topic].length > 0 && (
                    <span className="truncate">
                      {[...entry.pillar_focus, ...entry.sub_topic].join(" / ")}
                    </span>
                  )}
                </div>
                <p className="truncate text-sm">
                  {entry.key_lesson_insight ||
                    entry.what_i_did_experienced ||
                    "No lesson recorded yet"}
                </p>
              </div>
            </Link>
          </div>
        ))}
        {(entries?.length ?? 0) === 0 && (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No entries yet. Add your first one with + New Entry.
          </div>
        )}
      </GlowCard>
    </div>
  );
}
