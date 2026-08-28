import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { IDEA_SOURCES, IDEA_STATUSES, type Idea } from "@/lib/types";
import { GlowCard } from "@/components/glow-card";
import { PillarSubTopicSelects } from "@/components/pillar-sub-topic-selects";
import { IdeaFormatPlatformFields } from "@/components/idea-format-platform-fields";
import { SaveToast } from "@/components/save-toast";
import { getMergedPillarStructure } from "@/lib/custom-sub-topics";
import { isViewsGoal } from "@/lib/goals";
import { updateIdea, deleteIdea, transferToCalendar } from "./actions";

export default async function IdeaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;
  const supabase = await createClient();

  const { data: idea } = await supabase
    .from("ideas")
    .select(
      "id, brand, idea_title, pillar, sub_topic, format, platform, brief_description, reference_url, idea_source, source_detail, status, migrated_to_content_id",
    )
    .eq("id", id)
    .single<Idea>();

  if (!idea) {
    notFound();
  }

  const [structure, { data: goalRows }] = await Promise.all([
    getMergedPillarStructure(idea.brand),
    // Same source of truth as Content Calendar's own picker
    // (calendar/[id]/page.tsx): goals.platform_name for this brand, no
    // static fallback list.
    supabase
      .from("goals")
      .select("platform_name")
      .eq("brand", idea.brand)
      .not("platform_name", "is", null),
  ]);
  const knownPlatforms = [
    ...new Set(
      (goalRows ?? [])
        .map((g) => g.platform_name)
        .filter((p): p is string => !!p && !isViewsGoal(p)),
    ),
  ];

  const boundUpdate = updateIdea.bind(null, idea.id);
  const boundDelete = deleteIdea.bind(null, idea.id);
  const boundTransfer = transferToCalendar.bind(null, idea.id);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-10">
      <SaveToast token={saved ?? null} />
      <Link href="/ideas" className="text-sm text-muted-foreground hover:underline">
        &larr; Idea Panel
      </Link>

      {idea.migrated_to_content_id ? (
        <Link
          href={`/calendar/${idea.migrated_to_content_id}`}
          className="mt-2 block text-sm text-muted-foreground hover:underline"
        >
          Open in Content Calendar &rarr;
        </Link>
      ) : null}

      {/* Section 19: reuses the same auto-created content_calendar row as
          the status dropdown below if one already exists, rather than
          creating a duplicate. Also the action that assigns the item's
          first real production_status and makes it first appear as a
          card on the Calendar view. */}
      <GlowCard glow={1} className="mt-3 flex items-center justify-between gap-3 p-3.5">
        <div>
          <p className="text-sm font-medium">Transfer to Calendar</p>
          <p className="text-xs text-muted-foreground">
            {idea.migrated_to_content_id
              ? "Already has a Content Calendar entry, marks it ready to record."
              : "Creates the Content Calendar entry and marks it ready to record."}
          </p>
        </div>
        <form action={boundTransfer}>
          <Button type="submit" size="sm">
            Transfer to Calendar
          </Button>
        </form>
      </GlowCard>

      <form action={boundUpdate} className="mt-4">
        <GlowCard glow={2} className="space-y-5 p-4">
        <div className="space-y-2.5">
          <Label htmlFor="idea_title">Idea title</Label>
          <Input id="idea_title" name="idea_title" defaultValue={idea.idea_title} required />
        </div>

        <div className="space-y-2.5">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            defaultValue={idea.status}
            className="h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
          >
            {IDEA_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Moving to Research or Ready to work creates a full Content Calendar entry the
            first time, if one doesn&apos;t already exist for this idea. It stays off the
            Calendar view (workable from here and from its Content Calendar page directly)
            until Transfer to Calendar above assigns its first production status. From
            there, Run Research pulls YouTube/Google/Reddit/Quora, and Deep Research goes a
            level further on top of that pull.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <PillarSubTopicSelects
            structure={structure}
            initialPillar={idea.pillar ?? ""}
            initialSubTopic={idea.sub_topic ?? ""}
          />
        </div>

        {/* Full width, not paired in a grid: unlike Content Calendar's
            Format (naturally paired with Publish date), nothing here
            pairs with it, and the platform picker below it needs the
            full row anyway. */}
        <div className="space-y-4">
          <IdeaFormatPlatformFields
            initialFormat={idea.format ?? ""}
            initialPlatforms={idea.platform ?? []}
            knownPlatforms={knownPlatforms}
          />
        </div>

        <div className="space-y-2.5">
          <Label htmlFor="idea_source">Idea source</Label>
          <select
            id="idea_source"
            name="idea_source"
            defaultValue={idea.idea_source ?? ""}
            className="h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
          >
            <option value="">-</option>
            {IDEA_SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2.5">
          <Label htmlFor="brief_description">Brief description</Label>
          <Textarea
            id="brief_description"
            name="brief_description"
            defaultValue={idea.brief_description ?? ""}
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2.5">
            <Label htmlFor="reference_url">Reference URL</Label>
            <Input id="reference_url" name="reference_url" defaultValue={idea.reference_url ?? ""} />
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="source_detail">Source detail</Label>
            <Input id="source_detail" name="source_detail" defaultValue={idea.source_detail ?? ""} />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button type="submit">Save</Button>
        </div>
        </GlowCard>
      </form>

      <form action={boundDelete} className="mt-6">
        <Button type="submit" variant="destructive" size="sm">
          Delete idea
        </Button>
      </form>
    </div>
  );
}
