import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";
import { CollapsibleSection } from "@/components/collapsible-section";

type LiveTextRow = {
  content_id: string;
  variant_text: string;
  performance_rating: number | null;
  content_calendar: { final_title: string | null } | { final_title: string | null }[] | null;
};

type LiveThumbnailRow = {
  content_id: string;
  concept: string | null;
  performance_rating: number | null;
  content_calendar: { final_title: string | null } | { final_title: string | null }[] | null;
};

type Group = {
  key: string;
  uses: number;
  avgRating: number | null;
  items: { content_id: string; final_title: string }[];
};

function titleOf(row: { content_calendar: LiveTextRow["content_calendar"] }) {
  const cc = row.content_calendar;
  const rec = Array.isArray(cc) ? cc[0] : cc;
  return rec?.final_title || "Untitled";
}

// Section 11: an automatic aggregation, not a manual-entry space. There's
// no separate hook/title "type" taxonomy field anywhere in the schema
// (deliberately, per the Hook Type Performance graph note in Section
// 6.3, a disconnected standalone type field would go stale). Grouping
// by the exact live text is the only grouping the current data actually
// supports, a hook reused word-for-word across items is what "type" can
// honestly mean here. Thumbnails group by concept, the closest thing to
// a pattern label already on that table.
function groupByText(rows: LiveTextRow[]): Group[] {
  const map = new Map<string, Group>();
  for (const r of rows) {
    const key = r.variant_text.trim();
    if (!key) continue;
    const group = map.get(key) ?? { key, uses: 0, avgRating: null, items: [] };
    group.uses += 1;
    group.items.push({ content_id: r.content_id, final_title: titleOf(r) });
    map.set(key, group);
  }
  for (const group of map.values()) {
    const rated = rows.filter((r) => r.variant_text.trim() === group.key && r.performance_rating !== null);
    group.avgRating =
      rated.length > 0
        ? rated.reduce((sum, r) => sum + (r.performance_rating ?? 0), 0) / rated.length
        : null;
  }
  return [...map.values()].sort((a, b) => b.uses - a.uses);
}

function groupThumbnailsByConcept(rows: LiveThumbnailRow[]): Group[] {
  const map = new Map<string, Group>();
  for (const r of rows) {
    const key = r.concept?.trim() || "Unlabeled concept";
    const group = map.get(key) ?? { key, uses: 0, avgRating: null, items: [] };
    group.uses += 1;
    group.items.push({ content_id: r.content_id, final_title: titleOf(r) });
    map.set(key, group);
  }
  for (const group of map.values()) {
    const rated = rows.filter(
      (r) => (r.concept?.trim() || "Unlabeled concept") === group.key && r.performance_rating !== null,
    );
    group.avgRating =
      rated.length > 0
        ? rated.reduce((sum, r) => sum + (r.performance_rating ?? 0), 0) / rated.length
        : null;
  }
  return [...map.values()].sort((a, b) => b.uses - a.uses);
}

function GroupList({ groups, emptyLabel }: { groups: Group[]; emptyLabel: string }) {
  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <ul className="space-y-2">
      {groups.map((g) => (
        <li key={g.key} className="rounded-lg border border-border p-3">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium">{g.key}</p>
            <span className="shrink-0 text-xs text-muted-foreground">
              {g.uses} use{g.uses === 1 ? "" : "s"}
              {g.avgRating !== null ? ` · avg rating ${g.avgRating.toFixed(1)}` : " · not yet rated"}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
            {g.items.map((item, i) => (
              <Link
                key={`${item.content_id}-${i}`}
                href={`/calendar/${item.content_id}`}
                className="text-xs text-muted-foreground hover:underline"
              >
                {item.final_title}
              </Link>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function HookLibraryPage() {
  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  const supabase = await createClient();

  const [{ data: hooks }, { data: titles }, { data: thumbnails }] = await Promise.all([
    supabase
      .from("hook_variants")
      .select("content_id, variant_text, performance_rating, content_calendar:content_id(final_title)")
      .eq("brand", brand)
      .eq("is_live", true),
    supabase
      .from("title_variants")
      .select("content_id, variant_text, performance_rating, content_calendar:content_id(final_title)")
      .eq("brand", brand)
      .eq("is_live", true),
    supabase
      .from("thumbnail_variants")
      .select("content_id, concept, performance_rating, content_calendar:content_id(final_title)")
      .eq("brand", brand)
      .eq("is_live", true),
  ]);

  const hookGroups = groupByText((hooks ?? []) as LiveTextRow[]);
  const titleGroups = groupByText((titles ?? []) as LiveTextRow[]);
  const thumbnailGroups = groupThumbnailsByConcept((thumbnails ?? []) as LiveThumbnailRow[]);

  return (
    <div className="w-full px-4 py-10">
      <h1 className="text-3xl font-bold">Hook Library</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        An automatic aggregation of whichever Title, Hook, and Thumbnail variant is live on
        each item, not somewhere to add entries directly. Performance ratings show once
        they&apos;re tracked on individual variants.
      </p>

      <div className="mt-6 space-y-3">
        <CollapsibleSection title={`Hook Patterns (${hookGroups.length})`} defaultOpen>
          <GroupList groups={hookGroups} emptyLabel="No live hooks yet. Use a hook variant on a topic page to see it here." />
        </CollapsibleSection>

        <CollapsibleSection title={`Title Patterns (${titleGroups.length})`}>
          <GroupList groups={titleGroups} emptyLabel="No live titles yet." />
        </CollapsibleSection>

        <CollapsibleSection title={`Thumbnail Patterns (${thumbnailGroups.length})`}>
          <GroupList groups={thumbnailGroups} emptyLabel="No live thumbnails yet." />
        </CollapsibleSection>
      </div>
    </div>
  );
}
