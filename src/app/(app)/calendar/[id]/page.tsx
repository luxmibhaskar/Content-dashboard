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
import { CopyButton } from "@/components/copy-button";
import { ResearchOutputSection } from "@/components/research-output-section";
import {
  EARNED_THE_CLICK_OPTIONS,
  ENERGY_TAG_PRESETS,
  FORMATS,
  IDEA_SOURCES,
  PRODUCTION_STATUSES,
  SUCCESS_METRIC_FOCUS_OPTIONS,
  TARGET_STAGES,
  TONE_STYLES,
  VIABILITY_STATUSES,
  type ChecklistItem,
  type ContentCalendarDetail,
  type MainPoint,
  type PlatformPublishing,
  type TextVariant,
  type ThumbnailVariant,
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
  platform_publishing,
  sequence_step, sequence_order_custom, evidence_condition, script_outline_link,
  published_url, performance_notes, series_playlist, search_demand_trend_signal,
  success_metric_focus, follow_up_content_ideas, analytics_review_date,
  retention_drop_timestamp, retention_drop_note, earned_the_click, earned_click_note,
  derived_from_content_id,
  views, likes, comments, shares, saves, conversions,
  final_description, plain_keyword_tags, question_style_tags,
  core_tags, detailed_viewer_search_phrase_tags
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

  const [
    { data: siblingItems },
    { data: sourceItem },
    { data: derivativeItems },
    { data: titleVariants },
    { data: hookVariants },
    { data: thumbnailVariants },
  ] = await Promise.all([
    supabase
      .from("content_calendar")
      .select("id, final_title")
      .eq("brand", item.brand)
      .neq("id", item.id)
      .order("final_title", { ascending: true }),
    item.derived_from_content_id
      ? supabase
          .from("content_calendar")
          .select("id, final_title")
          .eq("id", item.derived_from_content_id)
          .single()
      : Promise.resolve({ data: null }),
    supabase
      .from("content_calendar")
      .select("id, final_title")
      .eq("derived_from_content_id", item.id),
    supabase
      .from("title_variants")
      .select("id, variant_text, rank, source, performance_rating, is_live")
      .eq("content_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("hook_variants")
      .select("id, variant_text, rank, source, performance_rating, is_live")
      .eq("content_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("thumbnail_variants")
      .select("id, concept, main_text_on_image, visual_elements, emotion_vibe, rank, source, performance_rating, is_live")
      .eq("content_id", id)
      .order("created_at", { ascending: true }),
  ]);

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

  const hasSystemProduction = Boolean(
    item.sequence_step ||
      item.sequence_order_custom !== null ||
      item.evidence_condition ||
      item.script_outline_link ||
      item.published_url ||
      item.performance_notes ||
      item.series_playlist ||
      item.search_demand_trend_signal ||
      item.success_metric_focus ||
      (item.follow_up_content_ideas && item.follow_up_content_ideas.length > 0) ||
      item.analytics_review_date ||
      item.retention_drop_timestamp ||
      item.retention_drop_note ||
      item.earned_the_click ||
      item.earned_click_note ||
      item.views !== null ||
      item.likes !== null ||
      item.comments !== null ||
      item.shares !== null ||
      item.saves !== null ||
      item.conversions !== null ||
      (item.core_tags && item.core_tags.length > 0) ||
      (item.detailed_viewer_search_phrase_tags && item.detailed_viewer_search_phrase_tags.length > 0),
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/calendar" className="text-sm text-muted-foreground hover:underline">
        &larr; Content Calendar
      </Link>

      {sourceItem && (
        <Link
          href={`/calendar/${sourceItem.id}`}
          className="mt-2 block text-sm text-muted-foreground hover:underline"
        >
          Repurposed from: {sourceItem.final_title || "Untitled"}
        </Link>
      )}
      {(derivativeItems?.length ?? 0) > 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          Derivatives ({derivativeItems!.length}):{" "}
          {derivativeItems!.map((d, i) => (
            <span key={d.id}>
              {i > 0 && " · "}
              <Link href={`/calendar/${d.id}`} className="hover:underline">
                {d.final_title || "Untitled"}
              </Link>
            </span>
          ))}
        </p>
      )}

      <form action={boundUpdate} className="mt-4 space-y-5">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="final_title">Title</Label>
            <CopyButton targetId="final_title" />
          </div>
          <Input
            id="final_title"
            name="final_title"
            defaultValue={item.final_title ?? ""}
            placeholder="Untitled"
          />
        </div>

        <div className="space-y-4 rounded-lg border border-border p-4">
          <div>
            <p className="text-sm font-medium">Copy-Ready</p>
            <p className="text-xs text-muted-foreground">
              Auto-populated as research and variants land, editable anytime, one tap to
              copy into wherever it&apos;s going.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="final_description">Final description</Label>
              <CopyButton targetId="final_description" />
            </div>
            <Textarea
              id="final_description"
              name="final_description"
              defaultValue={item.final_description ?? ""}
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="plain_keyword_tags">Plain keyword tags (one per line)</Label>
              <CopyButton targetId="plain_keyword_tags" transform="commaJoin" />
            </div>
            <Textarea
              id="plain_keyword_tags"
              name="plain_keyword_tags"
              defaultValue={(item.plain_keyword_tags ?? []).join("\n")}
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="question_style_tags">
                Question-style tags (one per line, phrased as real people search)
              </Label>
              <CopyButton targetId="question_style_tags" transform="commaJoin" />
            </div>
            <Textarea
              id="question_style_tags"
              name="question_style_tags"
              defaultValue={(item.question_style_tags ?? []).join("\n")}
              rows={2}
            />
          </div>
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

        <CollapsibleSection title="System & Production" defaultOpen={hasSystemProduction}>
          <div className="space-y-1.5">
            <Label htmlFor="core_tags">Core tags (one per line, 5-10)</Label>
            <p className="text-xs text-muted-foreground">
              From 10.1.3 Research Output. Custom title/hook/thumbnail options live in the
              Research Output section below the Save button.
            </p>
            <Textarea
              id="core_tags"
              name="core_tags"
              defaultValue={(item.core_tags ?? []).join("\n")}
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="detailed_viewer_search_phrase_tags">
              Detailed viewer search-phrase tags (one per line, exact phrasing, 10-20)
            </Label>
            <Textarea
              id="detailed_viewer_search_phrase_tags"
              name="detailed_viewer_search_phrase_tags"
              defaultValue={(item.detailed_viewer_search_phrase_tags ?? []).join("\n")}
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="derived_from_content_id">Repurposed from (source video)</Label>
            <select
              id="derived_from_content_id"
              name="derived_from_content_id"
              defaultValue={item.derived_from_content_id ?? ""}
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">- Not a repurposed piece -</option>
              {(siblingItems ?? []).map((sibling) => (
                <option key={sibling.id} value={sibling.id}>
                  {sibling.final_title || "Untitled"}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sequence_step">Sequence step</Label>
              <Input
                id="sequence_step"
                name="sequence_step"
                defaultValue={item.sequence_step ?? ""}
                placeholder="e.g. V1"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sequence_order_custom">Custom order</Label>
              <Input
                id="sequence_order_custom"
                name="sequence_order_custom"
                type="number"
                defaultValue={item.sequence_order_custom ?? ""}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="evidence_condition">Evidence condition (optional)</Label>
            <Input
              id="evidence_condition"
              name="evidence_condition"
              defaultValue={item.evidence_condition ?? ""}
              placeholder="e.g. 3-week Pinterest window"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="script_outline_link">Script outline link (external doc)</Label>
              <Input
                id="script_outline_link"
                name="script_outline_link"
                defaultValue={item.script_outline_link ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="published_url">Published URL</Label>
              <Input id="published_url" name="published_url" defaultValue={item.published_url ?? ""} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="performance_notes">Performance notes</Label>
            <Textarea
              id="performance_notes"
              name="performance_notes"
              defaultValue={item.performance_notes ?? ""}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="series_playlist">Series / playlist</Label>
              <Input id="series_playlist" name="series_playlist" defaultValue={item.series_playlist ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="search_demand_trend_signal">Search demand / trend signal</Label>
              <Input
                id="search_demand_trend_signal"
                name="search_demand_trend_signal"
                defaultValue={item.search_demand_trend_signal ?? ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="success_metric_focus">Success metric focus</Label>
              <select
                id="success_metric_focus"
                name="success_metric_focus"
                defaultValue={item.success_metric_focus ?? ""}
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">-</option>
                {SUCCESS_METRIC_FOCUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="analytics_review_date">Analytics review date</Label>
              <Input
                id="analytics_review_date"
                name="analytics_review_date"
                type="date"
                defaultValue={item.analytics_review_date ?? ""}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="follow_up_content_ideas">Follow-up content ideas (one per line)</Label>
            <Textarea
              id="follow_up_content_ideas"
              name="follow_up_content_ideas"
              defaultValue={(item.follow_up_content_ideas ?? []).join("\n")}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="retention_drop_timestamp">Retention drop timestamp</Label>
              <Input
                id="retention_drop_timestamp"
                name="retention_drop_timestamp"
                defaultValue={item.retention_drop_timestamp ?? ""}
                placeholder="e.g. 2:15"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="retention_drop_note">Retention drop note</Label>
              <Input
                id="retention_drop_note"
                name="retention_drop_note"
                defaultValue={item.retention_drop_note ?? ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="earned_the_click">Did I earn the click?</Label>
              <select
                id="earned_the_click"
                name="earned_the_click"
                defaultValue={item.earned_the_click ?? ""}
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">-</option>
                {EARNED_THE_CLICK_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="earned_click_note">Earned click note (optional)</Label>
              <Input
                id="earned_click_note"
                name="earned_click_note"
                defaultValue={item.earned_click_note ?? ""}
              />
            </div>
          </div>

          <div className="space-y-1.5 border-t border-border pt-4">
            <Label>Performance metrics</Label>
            <p className="text-xs text-muted-foreground">
              Leave a field blank if it&apos;s not tracked yet, that&apos;s different
              from entering 0, Analytics Overview hides KPIs it has no data for
              rather than showing a misleading zero.
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="views">Views</Label>
                <Input id="views" name="views" type="number" min={0} defaultValue={item.views ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="likes">Likes</Label>
                <Input id="likes" name="likes" type="number" min={0} defaultValue={item.likes ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="comments">Comments</Label>
                <Input
                  id="comments"
                  name="comments"
                  type="number"
                  min={0}
                  defaultValue={item.comments ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="shares">Shares</Label>
                <Input id="shares" name="shares" type="number" min={0} defaultValue={item.shares ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="saves">Saves</Label>
                <Input id="saves" name="saves" type="number" min={0} defaultValue={item.saves ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="conversions">Conversions</Label>
                <Input
                  id="conversions"
                  name="conversions"
                  type="number"
                  min={0}
                  defaultValue={item.conversions ?? ""}
                />
              </div>
            </div>
          </div>
        </CollapsibleSection>

        <div className="flex items-center justify-between pt-2">
          <ProductionStatusTracker status={item.production_status} />
          <Button type="submit">Save</Button>
        </div>
      </form>

      {/* Outside the main form on purpose: each variant's Use This/Remove
          is its own tiny form, and HTML doesn't allow nesting forms. */}
      <div className="mt-5">
        <ResearchOutputSection
          contentId={item.id}
          titleVariants={(titleVariants ?? []) as TextVariant[]}
          hookVariants={(hookVariants ?? []) as TextVariant[]}
          thumbnailVariants={(thumbnailVariants ?? []) as ThumbnailVariant[]}
        />
      </div>
    </div>
  );
}
