import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PillarSubtopicPicker } from "@/components/pillar-subtopic-picker";
import { GlowCard } from "@/components/glow-card";
import { SaveToast } from "@/components/save-toast";
import { getMergedPillarStructure } from "@/lib/custom-sub-topics";
import { MOOD_ENERGY_OPTIONS, type JourneyEntry } from "@/lib/types";
import { updateJourneyEntry, deleteJourneyEntry } from "./actions";

export default async function JourneyEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;
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
    // Same list /journey shows, scoped to this brand and minus the entry
    // open in the form above. No date/pillar/keyword filters here, this
    // is a quick "what else have I logged" reference, not the full
    // searchable index that page already is.
    supabase
      .from("journey_log")
      .select(
        "id, entry_date, pillar_focus, sub_topic, what_i_did_experienced, key_lesson_insight, angle_worthy",
      )
      .eq("brand", entry.brand)
      .neq("id", entry.id)
      .order("entry_date", { ascending: false }),
  ]);
  const pastEntries = (pastEntriesData ?? []) as JourneyEntry[];

  const boundUpdate = updateJourneyEntry.bind(null, entry.id);
  const boundDelete = deleteJourneyEntry.bind(null, entry.id);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-10">
      <SaveToast token={saved ?? null} />
      <Link href="/journey" className="text-sm text-muted-foreground hover:underline">
        &larr; My Journey Log
      </Link>

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

        <div className="grid grid-cols-2 gap-4">
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

        <div className="flex items-center justify-between pt-2">
          <Button type="submit">Save</Button>
        </div>
      </form>

      <form action={boundDelete} className="mt-6">
        <Button type="submit" variant="destructive" size="sm">
          Delete entry
        </Button>
      </form>

      {pastEntries.length > 0 && (
        <div className="mt-10 border-t border-border pt-6">
          <h2 className="text-sm font-medium text-muted-foreground">Past Journey Log</h2>
          <GlowCard glow={1} className="mt-2 divide-y divide-border">
            {pastEntries.map((e) => (
              <Link
                key={e.id}
                href={`/journey/${e.id}`}
                className="flex items-center justify-between gap-4 px-3 py-2.5 hover:bg-muted/30"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{e.entry_date}</span>
                    {e.angle_worthy && <span title="Angle-worthy">&#9733;</span>}
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
            ))}
          </GlowCard>
        </div>
      )}
    </div>
  );
}
