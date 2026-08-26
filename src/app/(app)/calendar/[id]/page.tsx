import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProductionStatusTracker } from "@/components/production-status-tracker";
import { CopyButton } from "@/components/copy-button";
import { TopicPageTabs } from "@/components/topic-page-tabs";
import { PillarSubTopicSelects } from "@/components/pillar-sub-topic-selects";
import { FormatPlatformFields } from "@/components/format-platform-fields";
import { getMergedPillarStructure } from "@/lib/custom-sub-topics";
import { isViewsGoal } from "@/lib/goals";
import {
  PRODUCTION_STATUSES,
  VIABILITY_STATUSES,
  type ContentCalendarDetail,
  type ManualWorkflowPhaseRow,
  type ReferenceVideo,
  type ResearchCopyVersion,
  type ScriptsVersion,
} from "@/lib/types";
import { updateContentItem } from "./actions";
import { retrieveContentDetail } from "@/lib/archive-lifecycle";

// Research & Copy's Run now runs 3 sequential Claude calls in one server
// action request (see research-copy-actions.ts), and the research call
// alone has already run 223s+ on a real topic. Vercel's serverless
// default sits well under that. maxDuration only takes effect set at the
// page level (Next.js docs, route-segment-config/maxDuration), it does
// nothing set on the action file itself.
export const maxDuration = 300;

// docs/topic-page-redesign.md: supersedes the original 10.1.1-10.1.6
// section structure. Creator Input, Audience Strategy, Viewer POV,
// Normal POV, and Recording Section are gone as separate sections,
// replaced by the two-tab Research & Copy / Scripts structure below.
// System & Production and Performance are unaffected, still collapsible
// sections further down.
const SELECT_COLUMNS = `
  id, brand, final_title, production_status, viability_status, viability_reason_note,
  pillar, sub_topic, format, platform, publish_date, is_archived,
  raw_idea_title, raw_keywords_topics, brief_intent,
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

  const { data: initialItem } = await supabase
    .from("content_calendar")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .single<ContentCalendarDetail>();

  if (!initialItem) {
    notFound();
  }

  // Section 17.4: opening an archived item retrieves its full detail
  // back from Drive before the page renders, rather than showing
  // permanently-emptied fields for something that's actually still
  // safe and complete, just relocated.
  let item = initialItem;
  if (item.is_archived) {
    await retrieveContentDetail(supabase, id, item.brand);
    const { data: refreshed } = await supabase
      .from("content_calendar")
      .select(SELECT_COLUMNS)
      .eq("id", id)
      .single<ContentCalendarDetail>();
    if (refreshed) item = refreshed;
  }

  const [
    { data: sourceItem },
    { data: derivativeItems },
    { data: researchCopyVersions },
    { data: scriptsVersions },
    { data: referenceVideos },
    { data: manualWorkflowPhases },
    structure,
    { data: goalRows },
  ] = await Promise.all([
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
    // Manual (pasted) and AI (Run) coexist as separate rows now
    // (docs/topic-page-redesign.md Section 7), at most one of each
    // source per item, is_live marks which one is currently active.
    supabase
      .from("research_copy_versions")
      .select("id, source, data, is_live")
      .eq("content_id", id),
    supabase
      .from("scripts_versions")
      .select("id, source, data, is_live")
      .eq("content_id", id),
    // Section 10.2.1: newest first, per reference-videos-section.tsx's
    // own "cards stack newest first" comment.
    supabase
      .from("reference_videos")
      .select("id, content_id, url, hook_note, rehook_note, cta_note, date_added")
      .eq("content_id", id)
      .order("date_added", { ascending: false }),
    // docs/manual-workflow-redesign.md: at most one row per phase, gating
    // only needs to know whether parsed_data is set on each.
    supabase
      .from("manual_workflow_phases")
      .select("id, phase, raw_pasted_text, parsed_data, status")
      .eq("content_id", id),
    getMergedPillarStructure(item.brand),
    // Format's "Posted on" picker unions this with CONTENT_POST_PLATFORMS
    // (format-platform-fields.tsx), so a platform typed into Streak &
    // Goals' "add a platform goal" form shows up here too, no dedicated
    // platforms-registry table needed.
    supabase
      .from("goals")
      .select("platform_name")
      .eq("brand", item.brand)
      .not("platform_name", "is", null),
  ]);

  const boundUpdate = updateContentItem.bind(null, item.id);
  const publishDateValue = item.publish_date
    ? new Date(item.publish_date).toISOString().slice(0, 16)
    : "";
  const knownPlatforms = [
    ...new Set(
      (goalRows ?? [])
        .map((g) => g.platform_name)
        .filter((p): p is string => !!p && !isViewsGoal(p)),
    ),
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-10">
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

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="production_status">Production status</Label>
            <select
              id="production_status"
              name="production_status"
              defaultValue={item.production_status ?? ""}
              className="h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
            >
              <option value="">No status yet</option>
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
              className="h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
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
          <PillarSubTopicSelects
            structure={structure}
            initialPillar={item.pillar ?? ""}
            initialSubTopic={item.sub_topic ?? ""}
          />
        </div>

        <FormatPlatformFields
          initialFormat={item.format ?? ""}
          initialPlatforms={item.platform ?? []}
          publishDateValue={publishDateValue}
          knownPlatforms={knownPlatforms}
        />

        {/* Follow-up: relocated out of the removed System & Production
            section, the only field in there that fed anything outside
            itself (Analytics Overview's KPIs and charts,
            src/lib/analytics.ts), moved here rather than lost. Every
            other field that section held (core/detailed tags,
            repurposed-from, sequence step, evidence condition, script
            outline/published URL, performance notes, series/playlist,
            search demand signal, success metric focus, analytics
            review date, follow-up ideas, retention drop notes, earned-
            the-click) is gone from the UI and from updateContentItem's
            own write (./actions.ts), on purpose, not an oversight:
            leaving those keys in that update while removing their only
            inputs would have silently nulled them out on the next Save
            for any unrelated reason. The columns themselves stay in the
            schema, unused, per this project's "superseded field stays
            schema-only" convention, nothing already stored is deleted. */}
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

        <div className="flex items-center justify-between pt-2">
          <ProductionStatusTracker status={item.production_status} />
          <Button type="submit">Save</Button>
        </div>
      </form>

      {/* docs/topic-page-redesign.md Section 2: outside the main form on
          purpose, same reasoning as before, Tab 1's Use This/Run/Save
          are each their own tiny form and HTML doesn't allow nesting
          forms. */}
      <div className="mt-5">
        <TopicPageTabs
          contentId={item.id}
          briefIntent={item.brief_intent}
          keywords={item.raw_keywords_topics}
          researchCopyVersions={(researchCopyVersions ?? []) as ResearchCopyVersion[]}
          scriptsVersions={(scriptsVersions ?? []) as ScriptsVersion[]}
          referenceVideos={(referenceVideos ?? []) as ReferenceVideo[]}
          manualWorkflowPhases={(manualWorkflowPhases ?? []) as ManualWorkflowPhaseRow[]}
        />
      </div>
    </div>
  );
}
