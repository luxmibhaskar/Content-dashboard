import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PillarSubtopicPicker } from "@/components/pillar-subtopic-picker";
import { MOOD_ENERGY_OPTIONS, type JourneyEntry } from "@/lib/types";
import { updateJourneyEntry, deleteJourneyEntry } from "./actions";

export default async function JourneyEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const boundUpdate = updateJourneyEntry.bind(null, entry.id);
  const boundDelete = deleteJourneyEntry.bind(null, entry.id);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-10">
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
          brand={entry.brand}
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
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
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
          Angle-worthy (feeds the Personal Angle Bank, Phase 3)
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
    </div>
  );
}
