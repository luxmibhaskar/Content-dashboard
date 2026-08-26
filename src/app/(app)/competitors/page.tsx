import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";
import { pillarsFor } from "@/lib/pillars";
import { getMergedPillarStructure } from "@/lib/custom-sub-topics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubTopicMultiSelect } from "@/components/sub-topic-multiselect";
import { GlowCard } from "@/components/glow-card";
import { PLATFORMS } from "@/lib/types";
import { aggregateByContentId, type ContentPlatformPostWithSnapshots } from "@/lib/platform-analytics";
import { createCompetitor } from "./actions";

type BenchmarkTopic = {
  id: string;
  pillar: string | null;
  sub_topic: string | null;
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

  const [{ data: competitors }, { data: benchmarks }, structure, { data: platformPostRows }] = await Promise.all([
    supabase
      .from("competitors")
      .select("id, name, platform, profile_url, notes, active, sub_topics")
      .eq("brand", brand)
      .order("created_at", { ascending: false }),
    supabase
      .from("competitor_benchmarks")
      .select("competitor_id, content_calendar:content_id(id, pillar, sub_topic)")
      .eq("brand", brand),
    getMergedPillarStructure(brand),
    // docs/platform-performance-tracking.md Migration section: Avg Views
    // used to read content_calendar.views directly off the same embed
    // above; that column's gone from this query now, views comes from
    // here instead, matched back to each benchmark's topic by content id.
    supabase
      .from("content_platform_posts")
      .select(
        "content_id, published_at, content_platform_stats_snapshots(snapshot_date, views, likes, comments, saves, shares, reposts)",
      )
      .eq("brand", brand),
  ]);
  const viewsByContentId = aggregateByContentId((platformPostRows ?? []) as ContentPlatformPostWithSnapshots[]);

  // Filters the actual list below by each competitor's own tagged
  // sub-topics (set on Add Competitor / edit), not by which content
  // items they've happened to be benchmarked against, a freshly-tagged
  // competitor with zero benchmarks yet would otherwise never show up
  // under a filter, defeating the point of tagging them at creation.
  // Pillar has no column of its own, derived via structure (merged with
  // custom_sub_topics): a competitor matches a pillar filter if any
  // tagged sub-topic, custom or fixed, belongs to it.
  const visibleCompetitors = (competitors ?? []).filter((c) => {
    const tags: string[] = c.sub_topics ?? [];
    if (subTopicFilter && !tags.includes(subTopicFilter)) return false;
    if (pillarFilter) {
      const pillarSubs = new Set(structure[pillarFilter] ?? []);
      if (!tags.some((t) => pillarSubs.has(t))) return false;
    }
    return true;
  });

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
    // Analytics audit (2026-08-27) Phase 1: topicStats.views is null when
    // that topic hasn't been checked in yet (src/lib/platform-analytics.ts),
    // excluded from both sum and count here rather than treated as a
    // real 0, the same "don't let an untracked item drag the average
    // down" fix applied to Content Posted Time.
    const topicStats = topic ? viewsByContentId.get(topic.id) : undefined;
    if (topicStats && topicStats.views !== null) {
      const entry = viewTotals.get(b.competitor_id) ?? { sum: 0, count: 0 };
      entry.sum += topicStats.views;
      entry.count += 1;
      viewTotals.set(b.competitor_id, entry);
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold">Competitors</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        A high-level map of who you&apos;re benchmarking against. Per-topic benchmarks live
        on each Content Calendar item.
      </p>

      <form action={createCompetitor} className="mt-6">
        <GlowCard glow={1} className="space-y-3 p-4">
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
          <Label>Sub-topics</Label>
          {/* Keyed on the list length: SubTopicMultiSelect's picked tags
              are its own client-side state, a plain successful server
              action submission doesn't reset that (unlike the native
              Name/Notes inputs, which do clear), so without this a
              submitted competitor's tags would silently carry over into
              the next one. Changing the key remounts it fresh. */}
          <SubTopicMultiSelect
            key={competitors?.length ?? 0}
            structure={structure}
            initialSubTopics={[]}
          />
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
        </GlowCard>
      </form>

      <form method="get" action="/competitors" className="mt-6 flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="pillar">
            Pillar
          </label>
          <select
            id="pillar"
            name="pillar"
            defaultValue={pillarFilter ?? ""}
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
            defaultValue={subTopicFilter ?? ""}
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
        <Button type="submit" size="sm" variant="outline">
          Filter
        </Button>
        {(pillarFilter || subTopicFilter) && (
          <Link href="/competitors" className="text-xs text-muted-foreground hover:underline">
            Clear filters
          </Link>
        )}
      </form>

      <GlowCard glow={2} className="mt-3 divide-y divide-border">
        {visibleCompetitors.map((c) => (
          <div key={c.id}>
            <Link
              href={`/competitors/${c.id}`}
              className="flex items-center justify-between gap-4 px-3 py-2.5 hover:bg-muted/30"
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
                {c.sub_topics.length > 0 && (
                  <p className="truncate text-xs text-muted-foreground">
                    {c.sub_topics.join(" · ")}
                  </p>
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
          </div>
        ))}
        {visibleCompetitors.length === 0 && (competitors?.length ?? 0) === 0 && (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No competitors yet. Add your first one above.
          </div>
        )}
        {visibleCompetitors.length === 0 && (competitors?.length ?? 0) > 0 && (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No competitors match this filter.
          </div>
        )}
      </GlowCard>
    </div>
  );
}
