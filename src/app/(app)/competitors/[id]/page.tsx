import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubTopicMultiSelect } from "@/components/sub-topic-multiselect";
import { EntryReadView, ReadField } from "@/components/entry-read-view";
import { getMergedPillarStructure } from "@/lib/custom-sub-topics";
import { PLATFORMS, type Competitor } from "@/lib/types";
import { updateCompetitor, deleteCompetitor } from "./actions";

export default async function CompetitorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const { edit } = await searchParams;
  // ?edit=1 shows the form; without it, a read-only summary with an Edit
  // action. Tapping a saved competitor from the list lands in read mode.
  const isEditing = edit === "1";
  const supabase = await createClient();

  const { data: competitor } = await supabase
    .from("competitors")
    .select("id, brand, name, platform, profile_url, notes, active, sub_topics")
    .eq("id", id)
    .single<Competitor>();

  if (!competitor) {
    notFound();
  }

  const structure = await getMergedPillarStructure(competitor.brand);

  const { data: benchmarks } = await supabase
    .from("competitor_benchmarks")
    .select("id, content_id, why_benchmark, content_calendar:content_id(id, final_title)")
    .eq("competitor_id", id);

  const boundUpdate = updateCompetitor.bind(null, competitor.id);
  const boundDelete = deleteCompetitor.bind(null, competitor.id);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-10">
      <Link href="/competitors" className="text-sm text-muted-foreground hover:underline">
        &larr; Competitors
      </Link>

      {!isEditing && (
        <EntryReadView
          editHref={`/competitors/${competitor.id}?edit=1`}
          header={
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-semibold">{competitor.name}</span>
                {!competitor.active && (
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                    Inactive
                  </span>
                )}
              </div>
              {competitor.sub_topics.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {competitor.sub_topics.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </>
          }
        >
          {competitor.platform && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Platform</p>
              <p>{competitor.platform}</p>
            </div>
          )}
          {competitor.profile_url && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Profile URL</p>
              <a
                href={competitor.profile_url}
                target="_blank"
                rel="noreferrer"
                className="break-all text-sm text-primary underline underline-offset-2"
              >
                {competitor.profile_url}
              </a>
            </div>
          )}
          <ReadField label="Notes" value={competitor.notes} />
          {!competitor.platform && !competitor.profile_url && !competitor.notes && (
            <p className="text-sm text-muted-foreground">
              Only a name so far. Use Edit to add details.
            </p>
          )}
        </EntryReadView>
      )}

      {isEditing && (
      <>
      <form action={boundUpdate} className="mt-4 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" defaultValue={competitor.name} required />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="platform">Platform</Label>
            <Input
              id="platform"
              name="platform"
              list="platform-options"
              defaultValue={competitor.platform ?? ""}
            />
            <datalist id="platform-options">
              {PLATFORMS.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile_url">Profile URL</Label>
            <Input id="profile_url" name="profile_url" defaultValue={competitor.profile_url ?? ""} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Sub-topics</Label>
          <SubTopicMultiSelect structure={structure} initialSubTopics={competitor.sub_topics} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" defaultValue={competitor.notes ?? ""} rows={3} />
        </div>

        <label className="flex items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={competitor.active}
            className="size-3.5"
          />
          Active
        </label>

        <div className="flex items-center gap-2 pt-2">
          <Button type="submit">Save</Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/competitors/${competitor.id}`}>Cancel</Link>
          </Button>
        </div>
      </form>

      <form action={boundDelete} className="mt-6">
        <Button type="submit" variant="destructive" size="sm">
          Delete competitor
        </Button>
      </form>
      </>
      )}

      <div className="mt-8 border-t border-border pt-6">
        <p className="text-sm font-medium">Used in {benchmarks?.length ?? 0} topics</p>
        {(benchmarks?.length ?? 0) > 0 && (
          <ul className="mt-2 space-y-1.5">
            {benchmarks!.map((b) => (
              <li key={b.id} className="text-sm">
                <Link href={`/calendar/${b.content_id}`} className="hover:underline">
                  {(b.content_calendar as unknown as { final_title: string | null })
                    ?.final_title || "Untitled"}
                </Link>
                {b.why_benchmark && (
                  <span className="text-muted-foreground">: {b.why_benchmark}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
