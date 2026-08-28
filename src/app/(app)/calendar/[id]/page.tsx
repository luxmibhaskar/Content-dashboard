import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/copy-button";
import { TopicPageTabs } from "@/components/topic-page-tabs";
import { PillarSubTopicSelects } from "@/components/pillar-sub-topic-selects";
import { FormatPlatformFields, type LongFormTopicOption } from "@/components/format-platform-fields";
import { PlatformAnalyticsSection } from "@/components/platform-analytics-section";
import { DirtyFormRegion } from "@/components/dirty-form-tracker";
import { getMergedPillarStructure } from "@/lib/custom-sub-topics";
import { isViewsGoal } from "@/lib/goals";
import {
  PRODUCTION_STATUSES,
  type ContentCalendarDetail,
  type ContentPlatformPost,
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
  id, brand, final_title, production_status,
  pillar, sub_topic, format, platform, publish_date, is_archived,
  raw_idea_title, raw_keywords_topics, brief_intent,
  sequence_step, sequence_order_custom, evidence_condition, script_outline_link,
  published_url, performance_notes, series_playlist, search_demand_trend_signal,
  success_metric_focus, follow_up_content_ideas, analytics_review_date,
  earned_the_click, earned_click_note,
  derived_from_content_id,
  conversions,
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
    { data: platformPosts },
    { data: longFormTopics },
    { data: liveHook },
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
    // The only source for Format's "Posted on" picker's option list
    // (format-platform-fields.tsx), by design, no static fallback: a
    // platform typed into Streak & Goals' "add a platform goal" form
    // shows up here, and deleting that goal removes it from here too,
    // no dedicated platforms-registry table needed.
    supabase
      .from("goals")
      .select("platform_name")
      .eq("brand", item.brand)
      .not("platform_name", "is", null),
    // docs/platform-performance-tracking.md Section 4: the per-item
    // Analytics section's data, one row per platform this item was
    // posted to, each with its own embedded snapshot history (Supabase
    // FK embed, content_platform_stats_snapshots.content_platform_post_id
    // -> content_platform_posts.id, same reverse-embed shape as
    // competitors/page.tsx's content_calendar:content_id(...) join).
    supabase
      .from("content_platform_posts")
      .select(
        "id, platform, published_at, content_platform_stats_snapshots(snapshot_date, views, likes, comments, saves, shares, reposts, retention_drop_timestamp, retention_drop_note)",
      )
      .eq("content_id", id)
      .order("published_at", { ascending: true }),
    // docs/platform-performance-tracking.md Section 6: the derived-from
    // picker's own option pool (format-platform-fields.tsx), filtered
    // and sliced to latest-5-per-pillar client-side, cheap at this app's
    // real data volume.
    supabase
      .from("content_calendar")
      .select("id, final_title, pillar, created_at")
      .eq("brand", item.brand)
      .eq("format", "Long Video")
      .order("created_at", { ascending: false }),
    // docs/platform-performance-tracking.md Sections 4 and 7: the "hook
    // used" surfaced in the Analytics section, is_live is the same
    // exclusive-flag pattern title_variants/thumbnail_variants use, set
    // by useHook (hook-actions.ts) when a Manual Packaging hook's "Use"
    // fires.
    supabase
      .from("hook_variants")
      .select("variant_text, performance_rating")
      .eq("content_id", id)
      .eq("is_live", true)
      .maybeSingle(),
  ]);

  const boundUpdate = updateContentItem.bind(null, item.id, item.brand);
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

      <DirtyFormRegion formId="topic-form" key={item.id}>
        <div className="mt-4 space-y-5">
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
              form="topic-form"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="production_status">Production status</Label>
            <select
              id="production_status"
              name="production_status"
              defaultValue={item.production_status ?? ""}
              className="h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
              form="topic-form"
            >
              <option value="">No status yet</option>
              {PRODUCTION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PillarSubTopicSelects
              structure={structure}
              initialPillar={item.pillar ?? ""}
              initialSubTopic={item.sub_topic ?? ""}
              formId="topic-form"
            />
          </div>

          {/* Owns the real <form id="topic-form">, further down: Reference
              Videos (between here and there, for Short; right after here
              for Long) has its own Add/Remove/Save-notes forms that can't
              nest inside it. See format-platform-fields.tsx's header
              comment. */}
          <FormatPlatformFields
            initialFormat={item.format ?? ""}
            initialPlatforms={item.platform ?? []}
            initialDescription={item.final_description ?? ""}
            publishDateValue={publishDateValue}
            knownPlatforms={knownPlatforms}
            structure={structure}
            longFormTopics={(longFormTopics ?? []) as LongFormTopicOption[]}
            initialPillar={item.pillar ?? ""}
            initialDerivedFromContentId={item.derived_from_content_id ?? ""}
            formId="topic-form"
            formAction={boundUpdate}
            productionStatus={item.production_status}
            contentId={item.id}
            referenceVideos={(referenceVideos ?? []) as ReferenceVideo[]}
          />
        </div>

        {/* docs/platform-performance-tracking.md Sections 4-5: directly
            below Production Status (the Save/ProductionStatusTracker row,
            now inside FormatPlatformFields' own <form>, immediately
            above), same as Long Form and Short Form alike, own
            collapsible container. Outside the main form, same reasoning
            as TopicPageTabs below: each platform's "Log a check-in" is
            its own tiny form. Conversions (Analytics and Conversion,
            topic page restructuring 2026-08-27) stays part of the one
            atomic Save via form="topic-form" despite living here, not
            inside FormatPlatformFields' <form>. */}
        <div className="mt-5">
          <PlatformAnalyticsSection
            contentId={item.id}
            brand={item.brand}
            format={item.format ?? ""}
            platforms={(platformPosts ?? []) as ContentPlatformPost[]}
            sourceItem={sourceItem}
            liveHook={liveHook}
            conversions={item.conversions}
            formId="topic-form"
          />
        </div>

        {/* docs/topic-page-redesign.md Section 2: outside the main form on
            purpose, same reasoning as before, Tab 1's Use This/Run/Save
            are each their own tiny form and HTML doesn't allow nesting
            forms. */}
        <div className="mt-5">
          <TopicPageTabs
            contentId={item.id}
            brand={item.brand}
            briefIntent={item.brief_intent}
            keywords={item.raw_keywords_topics}
            researchCopyVersions={(researchCopyVersions ?? []) as ResearchCopyVersion[]}
            scriptsVersions={(scriptsVersions ?? []) as ScriptsVersion[]}
            manualWorkflowPhases={(manualWorkflowPhases ?? []) as ManualWorkflowPhaseRow[]}
          />
        </div>
      </DirtyFormRegion>
    </div>
  );
}
