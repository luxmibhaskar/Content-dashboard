import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";
import { pillarsFor, subTopicsFor } from "@/lib/pillars";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PLATFORMS } from "@/lib/types";
import { createCompetitor } from "./actions";

type BenchmarkTopic = {
  pillar: string | null;
  sub_topic: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
} | null;

export default async function CompetitorsPage({
  searchParams,
}: {
  searchParams: Promise<{ pillar?: string; sub_topic?: string }>;
}) {
  const { pillar: pillarFilter, sub_topic: subTopicFilter } = await searchParams;
  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  const supabase = await createClient();

  const [{ data: competitors }, { data: benchmarks }] = await Promise.all([
    supabase
      .from("competitors")
      .select("id, name, platform, profile_url, notes, active")
      .eq("brand", brand)
      .order("created_at", { ascending: false }),
    supabase
      .from("competitor_benchmarks")
      .select("competitor_id, content_calendar:content_id(pillar, sub_topic, views, likes, comments, shares, saves)")
      .eq("brand", brand),
  ]);

  // Section 14.2, v2: filter the per-topic benchmarks by pillar/sub-topic
  // before rolling them up, so "Used in N topics" and Avg Views reflect
  // the filtered scope, not the competitor's whole history.
  const filteredBenchmarks = (benchmarks ?? []).filter((b) => {
    const topic = (Array.isArray(b.content_calendar) ? b.content_calendar[0] : b.content_calendar) as BenchmarkTopic;
    if (pillarFilter && topic?.pillar !== pillarFilter) return false;
    if (subTopicFilter && topic?.sub_topic !== subTopicFilter) return false;
    return true;
  });

  const benchmarkCounts = new Map<string, number>();
  const viewTotals = new Map<string, { sum: number; count: number }>();
  for (const b of filteredBenchmarks) {
    if (!b.competitor_id) continue;
    benchmarkCounts.set(b.competitor_id, (benchmarkCounts.get(b.competitor_id) ?? 0) + 1);
    const topic = (Array.isArray(b.content_calendar) ? b.content_calendar[0] : b.content_calendar) as BenchmarkTopic;
    if (topic?.views !== null && topic?.views !== undefined) {
      const entry = viewTotals.get(b.competitor_id) ?? { sum: 0, count: 0 };
      entry.sum += topic.views;
      entry.count += 1;
      viewTotals.set(b.competitor_id, entry);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Competitors</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        A high-level map of who you&apos;re benchmarking against. Per-topic benchmarks live
        on each Content Calendar item.
      </p>

      <form method="get" action="/competitors" className="mt-4 flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="pillar">
            Pillar
          </label>
          <select
            id="pillar"
            name="pillar"
            defaultValue={pillarFilter ?? ""}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
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
            defaultValue={subTopicFilter ?? ""}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">All</option>
            {subTopicsFor(brand).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" size="sm" variant="outline">
          Filter
        </Button>
        {(pillarFilter || subTopicFilter) && (
          <Link href="/competitors" className="text-xs text-muted-foreground hover:underline">
            Clear filters
          </Link>
        )}
      </form>

      <form
        action={createCompetitor}
        className="mt-6 space-y-3 rounded-lg border border-border p-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required placeholder="e.g. Competitor A" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="platform">Platform</Label>
            <Input
              id="platform"
              name="platform"
              list="platform-options"
              placeholder="YouTube, TikTok, multiple..."
            />
            <datalist id="platform-options">
              {PLATFORMS.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="profile_url">Profile URL</Label>
          <Input id="profile_url" name="profile_url" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={2}
            placeholder="Strong hooks, weak CTAs..."
          />
        </div>
        <Button type="submit" size="sm">
          + Add Competitor
        </Button>
      </form>

      <ul className="mt-6 divide-y divide-border rounded-lg border border-border">
        {(competitors ?? []).map((c) => (
          <li key={c.id}>
            <Link
              href={`/competitors/${c.id}`}
              className="flex items-center justify-between gap-4 px-3 py-2.5 hover:bg-muted/50"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{c.name}</span>
                  {!c.active && (
                    <span className="text-xs text-muted-foreground">(inactive)</span>
                  )}
                </div>
                {c.notes && (
                  <p className="truncate text-xs text-muted-foreground">{c.notes}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                {c.platform && <span>{c.platform}</span>}
                <span>Used in {benchmarkCounts.get(c.id) ?? 0} topics</span>
                {viewTotals.has(c.id) && (
                  <span>
                    Avg {Math.round(viewTotals.get(c.id)!.sum / viewTotals.get(c.id)!.count).toLocaleString()}{" "}
                    views on those
                  </span>
                )}
              </div>
            </Link>
          </li>
        ))}
        {(competitors?.length ?? 0) === 0 && (
          <li className="px-3 py-6 text-center text-sm text-muted-foreground">
            No competitors yet. Add your first one above.
          </li>
        )}
      </ul>
    </div>
  );
}
