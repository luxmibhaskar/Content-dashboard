import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProductionStatusTracker } from "@/components/production-status-tracker";
import { CollapsibleSection } from "@/components/collapsible-section";
import { ExpandCollapseAll } from "@/components/expand-collapse-all";
import { CompletenessChecklist } from "@/components/completeness-checklist";
import { MainPointersEditor } from "@/components/main-pointers-editor";
import { PlatformPublishingEditor } from "@/components/platform-publishing-editor";
import {
  ENERGY_TAG_PRESETS,
  FORMATS,
  IDEA_SOURCES,
  PRODUCTION_STATUSES,
  TARGET_STAGES,
  TONE_STYLES,
  VIABILITY_STATUSES,
  type ChecklistItem,
  type ContentCalendarDetail,
  type MainPoint,
  type PlatformPublishing,
} from "@/lib/types";
import { updateContentItem } from "./actions";

const SELECT_COLUMNS = `
  id, brand, final_title, production_status, viability_status, viability_reason_note,
  pillar, sub_topic, format, publish_date, is_archived,
  raw_idea_title, raw_keywords_topics, brief_intent, content_angle_hook_direction,
  reference_inspiration, target_stage_viewer_journey, my_angle_unique_pov,
  proof_credibility, tone_style, idea_source, source_detail,
  viewer_problem, promise_outcome, final_title_hook, viewer_keywords_search_phrases,
  viewer_description, primary_emotion_pain_point, objections_doubts, desired_action_cta,
  completeness_checklist, format_recommendation,
  main_pointers, energy_tag, full_script, voice_memo_transcript,
  platform_publishing
`;

export default async function TopicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: item } = await supabase
    .from("content_calendar")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .single<ContentCalendarDetail>();

  if (!item) {
    notFound();
  }

  const boundUpdate = updateContentItem.bind(null, item.id);
  const publishDateValue = item.publish_date
    ? new Date(item.publish_date).toISOString().slice(0, 16)
    : "";
  const checklistItems: ChecklistItem[] = item.completeness_checklist ?? [];

  const hasCreatorInput = Boolean(
    item.raw_idea_title ||
      item.raw_keywords_topics ||
      item.brief_intent ||
      item.content_angle_hook_direction ||
      item.reference_inspiration ||
      item.target_stage_viewer_journey ||
      item.my_angle_unique_pov ||
      item.proof_credibility ||
      item.tone_style ||
      item.idea_source ||
      item.source_detail,
  );

  const hasViewerPov = Boolean(
    item.viewer_problem ||
      item.promise_outcome ||
      item.final_title_hook ||
      item.viewer_keywords_search_phrases ||
      item.viewer_description ||
      item.primary_emotion_pain_point ||
      (item.objections_doubts && item.objections_doubts.length > 0) ||
      item.desired_action_cta ||
      item.format_recommendation ||
      checklistItems.length > 0,
  );

  const mainPoints: MainPoint[] = item.main_pointers ?? [];
  const hasRecording = Boolean(
    item.energy_tag || item.full_script || item.voice_memo_transcript || mainPoints.length > 0,
  );

  const platformPublishing: PlatformPublishing = item.platform_publishing ?? {};
  const hasPublishing = Object.values(platformPublishing).some((entry) =>
    Boolean(
      entry.platform_title ||
        entry.platform_description ||
        entry.platform_tags_hashtags ||
        entry.platform_angle_line,
    ),
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/calendar" className="text-sm text-muted-foreground hover:underline">
        &larr; Content Calendar
      </Link>

      <form action={boundUpdate} className="mt-4 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="final_title">Title</Label>
          <Input
            id="final_title"
            name="final_title"
            defaultValue={item.final_title ?? ""}
            placeholder="Untitled"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="production_status">Production status</Label>
            <select
              id="production_status"
              name="production_status"
              defaultValue={item.production_status}
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              {PRODUCTION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="viability_status">Viability status</Label>
            <select
              id="viability_status"
              name="viability_status"
              defaultValue={item.viability_status}
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              {VIABILITY_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="viability_reason_note">Viability reason (optional)</Label>
          <Input
            id="viability_reason_note"
            name="viability_reason_note"
            defaultValue={item.viability_reason_note ?? ""}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="pillar">Pillar</Label>
            <Input
              id="pillar"
              name="pillar"
              defaultValue={item.pillar ?? ""}
              placeholder="e.g. Body"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sub_topic">Sub-topic</Label>
            <Input
              id="sub_topic"
              name="sub_topic"
              defaultValue={item.sub_topic ?? ""}
              placeholder="e.g. Fitness & Weight Loss"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="format">Format</Label>
            <select
              id="format"
              name="format"
              defaultValue={item.format ?? ""}
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">-</option>
              {FORMATS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="publish_date">Publish date</Label>
            <Input
              id="publish_date"
              name="publish_date"
              type="datetime-local"
              defaultValue={publishDateValue}
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <h2 className="text-sm font-medium text-muted-foreground">More detail</h2>
          <ExpandCollapseAll />
        </div>

        <CollapsibleSection title="Creator Input" defaultOpen={hasCreatorInput}>
          <div className="space-y-1.5">
            <Label htmlFor="raw_idea_title">Raw idea title</Label>
            <Input id="raw_idea_title" name="raw_idea_title" defaultValue={item.raw_idea_title ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="raw_keywords_topics">Raw keywords / topics</Label>
            <Input
              id="raw_keywords_topics"
              name="raw_keywords_topics"
              defaultValue={item.raw_keywords_topics ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brief_intent">Brief intent</Label>
            <Textarea id="brief_intent" name="brief_intent" defaultValue={item.brief_intent ?? ""} rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="content_angle_hook_direction">Content angle / hook direction</Label>
            <Textarea
              id="content_angle_hook_direction"
              name="content_angle_hook_direction"
              defaultValue={item.content_angle_hook_direction ?? ""}
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reference_inspiration">Reference / inspiration (text + URLs)</Label>
            <Textarea
              id="reference_inspiration"
              name="reference_inspiration"
              defaultValue={item.reference_inspiration ?? ""}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="target_stage_viewer_journey">Target stage (viewer journey)</Label>
              <select
                id="target_stage_viewer_journey"
                name="target_stage_viewer_journey"
                defaultValue={item.target_stage_viewer_journey ?? ""}
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">-</option>
                {TARGET_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tone_style">Tone / style</Label>
              <select
                id="tone_style"
                name="tone_style"
                defaultValue={item.tone_style ?? ""}
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">-</option>
                {TONE_STYLES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="my_angle_unique_pov">My angle / unique POV</Label>
            <Textarea
              id="my_angle_unique_pov"
              name="my_angle_unique_pov"
              defaultValue={item.my_angle_unique_pov ?? ""}
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="proof_credibility">Proof / credibility</Label>
            <Textarea
              id="proof_credibility"
              name="proof_credibility"
              defaultValue={item.proof_credibility ?? ""}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="idea_source">Idea source</Label>
              <select
                id="idea_source"
                name="idea_source"
                defaultValue={item.idea_source ?? ""}
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">-</option>
                {IDEA_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="source_detail">Source detail</Label>
              <Input id="source_detail" name="source_detail" defaultValue={item.source_detail ?? ""} />
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Viewer POV" defaultOpen={hasViewerPov}>
          <div className="space-y-1.5">
            <Label htmlFor="viewer_problem">Viewer problem</Label>
            <Input id="viewer_problem" name="viewer_problem" defaultValue={item.viewer_problem ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="promise_outcome">Promise / outcome</Label>
            <Input id="promise_outcome" name="promise_outcome" defaultValue={item.promise_outcome ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="final_title_hook">Final title / hook</Label>
            <Input id="final_title_hook" name="final_title_hook" defaultValue={item.final_title_hook ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="viewer_keywords_search_phrases">Viewer keywords / search phrases</Label>
            <Textarea
              id="viewer_keywords_search_phrases"
              name="viewer_keywords_search_phrases"
              defaultValue={item.viewer_keywords_search_phrases ?? ""}
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="viewer_description">Viewer description</Label>
            <Textarea
              id="viewer_description"
              name="viewer_description"
              defaultValue={item.viewer_description ?? ""}
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="primary_emotion_pain_point">Primary emotion / pain point</Label>
            <Input
              id="primary_emotion_pain_point"
              name="primary_emotion_pain_point"
              defaultValue={item.primary_emotion_pain_point ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="objections_doubts">Objections / doubts (one per line)</Label>
            <Textarea
              id="objections_doubts"
              name="objections_doubts"
              defaultValue={(item.objections_doubts ?? []).join("\n")}
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desired_action_cta">Desired action / CTA</Label>
            <Input id="desired_action_cta" name="desired_action_cta" defaultValue={item.desired_action_cta ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="format_recommendation">
              Format recommendation (short vs long, and why)
            </Label>
            <Textarea
              id="format_recommendation"
              name="format_recommendation"
              defaultValue={item.format_recommendation ?? ""}
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Sub-topic completeness checklist</Label>
            <p className="text-xs text-muted-foreground">
              Manual for now, this auto-generates from research once Phase 2&apos;s
              research automation lands.
            </p>
            <CompletenessChecklist
              key={JSON.stringify(checklistItems)}
              name="completeness_checklist"
              initialItems={checklistItems}
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Publishing Ready" defaultOpen={hasPublishing}>
          <PlatformPublishingEditor
            key={JSON.stringify(platformPublishing)}
            name="platform_publishing"
            initialValue={platformPublishing}
          />
        </CollapsibleSection>

        <CollapsibleSection title="Recording Section" defaultOpen={hasRecording}>
          <div className="space-y-1.5">
            <Label htmlFor="voice_memo_transcript">Voice memo transcript</Label>
            <p className="text-xs text-muted-foreground">
              Manual for now, paste or type a transcript here. The actual
              &quot;just talk&quot; record-and-transcribe button is a separate,
              bigger piece (browser audio capture + speech-to-text) not built
              yet.
            </p>
            <Textarea
              id="voice_memo_transcript"
              name="voice_memo_transcript"
              defaultValue={item.voice_memo_transcript ?? ""}
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="energy_tag">Energy tag</Label>
            <input
              id="energy_tag"
              name="energy_tag"
              list="energy-tag-options"
              defaultValue={item.energy_tag ?? ""}
              placeholder="Calm, Direct, High Energy, or your own"
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
            />
            <datalist id="energy-tag-options">
              {ENERGY_TAG_PRESETS.map((tag) => (
                <option key={tag} value={tag} />
              ))}
            </datalist>
          </div>

          <CollapsibleSection title="Main Pointers" defaultOpen={mainPoints.length > 0}>
            <MainPointersEditor
              key={JSON.stringify(mainPoints)}
              name="main_pointers"
              initialPoints={mainPoints}
            />
          </CollapsibleSection>

          <CollapsibleSection title="Full Script" defaultOpen={Boolean(item.full_script)}>
            <Textarea
              id="full_script"
              name="full_script"
              defaultValue={item.full_script ?? ""}
              rows={8}
              placeholder="Word-for-word script, including delivery notes: what to emphasize, what to avoid, pacing cues."
            />
          </CollapsibleSection>
        </CollapsibleSection>

        <div className="flex items-center justify-between pt-2">
          <ProductionStatusTracker status={item.production_status} />
          <Button type="submit">Save</Button>
        </div>
      </form>
    </div>
  );
}
