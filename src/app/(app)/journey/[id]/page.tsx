import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PillarSubtopicPicker } from "@/components/pillar-subtopic-picker";
import { PillarTag } from "@/components/pillar-tag";
import { GlowCard } from "@/components/glow-card";
import { SaveToast } from "@/components/save-toast";
import { EntryReadView, ReadField } from "@/components/entry-read-view";
import { getMergedPillarStructure } from "@/lib/custom-sub-topics";
import { MOOD_ENERGY_OPTIONS, type JourneyEntry } from "@/lib/types";
import { updateJourneyEntry, deleteJourneyEntry } from "./actions";

export default async function JourneyEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; edit?: string }>;
}) {
  const { id } = await params;
  const { saved, edit } = await searchParams;
  // ?edit=1 shows the real form; without it, a read-only summary with an
  // Edit action. Tapping a saved entry from any list lands in read mode.
  const isEditing = edit === "1";
  const supabase = await createClient();

  const { data: entry } = await supabase
    .from("journey_log")
    .select(
      "id, brand, entry_date, pillar_focus, sub_topic, what_i_did_experienced, key_lesson_insight, proof_results, mood_energy, tags_keywords, angle_worthy",
    )
    .eq("id", id)
    .single<JourneyEntry>();

  if (!entry) {
    notFound();
  }

  const [structure, { data: pastEntriesData }] = await Promise.all([
    getMergedPillarStructure(entry.brand),
    // Same list /journey shows, scoped to this brand. The entry open in
    // the form above is kept in this list (tagged "Editing"), not
    // filtered out, so a just-created-then-saved entry appears here
    // straight away instead of only showing once you go back to
    // /journey. Mirrors Weekly Review's Past Reviews. No
    // date/pillar/keyword filters here, this is a quick "what else have I
    // logged" reference, not the full searchable index that page is.
    supabase
      .from("journey_log")
      .select(
        "id, entry_date, pillar_focus, sub_topic, what_i_did_experienced, key_lesson_insight, angle_worthy",
      )
      .eq("brand", entry.brand)
      .order("entry_date", { ascending: false }),
  ]);
  const pastEntries = (pastEntriesData ?? []) as JourneyEntry[];
  // Gate the section on there being an entry other than the one in the
  // form, so a brand-new first entry doesn't get a "Past Journey Log"
  // heading over a single row that's itself.
  const hasOtherEntries = pastEntries.some((e) => e.id !== entry.id);

  const boundUpdate = updateJourneyEntry.bind(null, entry.id);
  const boundDelete = deleteJourneyEntry.bind(null, entry.id);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-10">
      <SaveToast token={saved ?? null} />
      <Link href="/journey" className="text-sm text-muted-foreground hover:underline">
        &larr; My Journey Log
      </Link>

      {!isEditing && (
        <EntryReadView
          editHref={`/journey/${entry.id}?edit=1`}
          header={
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{entry.entry_date}</span>
                {entry.angle_worthy && (
                  <span className="text-xs text-muted-foreground" title="Angle-worthy">
                    &#9733; Angle-worthy
                  </span>
                )}
              </div>
              {(entry.pillar_focus.length > 0 || entry.sub_topic.length > 0) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {entry.pillar_focus.map((p) => (
                    <PillarTag key={p} pillar={p} />
                  ))}
                  {entry.sub_topic.map((s) => (
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
          <ReadField label="What I did / experienced" value={entry.what_i_did_experienced} />
          <ReadField label="Key lesson / insight" value={entry.key_lesson_insight} />
          <ReadField label="Proof / results" value={entry.proof_results} />
          {(entry.mood_energy || entry.tags_keywords) && (
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
              {entry.mood_energy && <span>Mood / energy: {entry.mood_energy}</span>}
              {entry.tags_keywords && <span>Tags: {entry.tags_keywords}</span>}
            </div>
          )}
          {!entry.what_i_did_experienced &&
            !entry.key_lesson_insight &&
            !entry.proof_results &&
            !entry.mood_energy &&
            !entry.tags_keywords && (
              <p className="text-sm text-muted-foreground">
                Nothing recorded yet. Use Edit to fill this entry in.
              </p>
            )}
        </EntryReadView>
      )}

      {isEditing && (
      <>
      <form action={boundUpdate} className="mt-4 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="entry_date">Date</Label>
          <Input id="entry_date" name="entry_date" type="date" defaultValue={entry.entry_date} />
        </div>

        <PillarSubtopicPicker
          key={entry.id}
          structure={structure}
          initialPillars={entry.pillar_focus}
          initialSubTopics={entry.sub_topic}
        />

        <div className="space-y-1.5">
          <Label htmlFor="what_i_did_experienced">What I did / experienced</Label>
          <Textarea
            id="what_i_did_experienced"
            name="what_i_did_experienced"
            defaultValue={entry.what_i_did_experienced ?? ""}
            rows={4}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="key_lesson_insight">Key lesson / insight</Label>
          <Textarea
            id="key_lesson_insight"
            name="key_lesson_insight"
            defaultValue={entry.key_lesson_insight ?? ""}
            rows={2}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="proof_results">Proof / results (optional)</Label>
          <Textarea
            id="proof_results"
            name="proof_results"
            defaultValue={entry.proof_results ?? ""}
            rows={2}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="mood_energy">Mood / energy</Label>
            <select
              id="mood_energy"
              name="mood_energy"
              defaultValue={entry.mood_energy ?? ""}
              className="h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
            >
              <option value="">-</option>
              {MOOD_ENERGY_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tags_keywords">Tags / keywords</Label>
            <Input id="tags_keywords" name="tags_keywords" defaultValue={entry.tags_keywords ?? ""} />
          </div>
        </div>

        <label className="flex items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            name="angle_worthy"
            defaultChecked={entry.angle_worthy}
            className="size-3.5"
          />
          Angle-worthy (shows with the &quot;Angle-worthy only&quot; filter on My Journey Log)
        </label>

        <div className="flex items-center gap-2 pt-2">
          <Button type="submit">Save</Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/journey/${entry.id}`}>Cancel</Link>
          </Button>
        </div>
      </form>

      <form action={boundDelete} className="mt-6">
        <Button type="submit" variant="destructive" size="sm">
          Delete entry
        </Button>
      </form>
      </>
      )}

      {hasOtherEntries && (
        <div className="mt-10 border-t border-border pt-6">
          <h2 className="text-sm font-medium text-muted-foreground">Past Journey Log</h2>
          <GlowCard neutral className="mt-2 divide-y divide-border">
            {pastEntries.map((e) => {
              const isCurrent = e.id === entry.id;
              return (
                <Link
                  key={e.id}
                  href={`/journey/${e.id}`}
                  className="flex items-center justify-between gap-4 px-3 py-2.5 hover:bg-muted/30"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{e.entry_date}</span>
                      {e.angle_worthy && <span title="Angle-worthy">&#9733;</span>}
                      {isCurrent && (
                        <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Editing
                        </span>
                      )}
                      {[...e.pillar_focus, ...e.sub_topic].length > 0 && (
                        <span className="truncate">
                          {[...e.pillar_focus, ...e.sub_topic].join(" / ")}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-sm">
                      {e.key_lesson_insight || e.what_i_did_experienced || "No lesson recorded yet"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </GlowCard>
        </div>
      )}
    </div>
  );
}
