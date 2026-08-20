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
import { CopyButton } from "@/components/copy-button";
import { TopicPageTabs } from "@/components/topic-page-tabs";
import { CompetitorBenchmarksSection } from "@/components/competitor-benchmarks-section";
import { GlowCard } from "@/components/glow-card";
import {
  EARNED_THE_CLICK_OPTIONS,
  FORMATS,
  PRODUCTION_STATUSES,
  SUCCESS_METRIC_FOCUS_OPTIONS,
  VIABILITY_STATUSES,
  type CompetitorBenchmark,
  type ContentCalendarDetail,
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
  pillar, sub_topic, format, publish_date, is_archived,
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
    { data: siblingItems },
    { data: sourceItem },
    { data: derivativeItems },
    { data: competitorBenchmarks },
    { data: competitors },
    { data: researchCopyVersions },
    { data: scriptsVersions },
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
      .from("competitor_benchmarks")
      .select("id, competitor_id, competitor_name, platform, url, why_benchmark, notes")
      .eq("content_id", id)
      .order("created_at", { ascending: true }),
    supabase.from("competitors").select("id, name").eq("brand", item.brand).eq("active", true),
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
  ]);

  const boundUpdate = updateContentItem.bind(null, item.id);
  const publishDateValue = item.publish_date
    ? new Date(item.publish_date).toISOString().slice(0, 16)
    : "";

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

        <GlowCard glow={1} className="space-y-4 p-4">
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
        </GlowCard>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="production_status">Production status</Label>
            <select
              id="production_status"
              name="production_status"
              defaultValue={item.production_status ?? ""}
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
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

        <CollapsibleSection title="System & Production" defaultOpen={hasSystemProduction}>
          <div className="space-y-1.5">
            <Label htmlFor="core_tags">Core tags (one per line, 5-10)</Label>
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
        />
      </div>

      <div className="mt-5">
        <CompetitorBenchmarksSection
          contentId={item.id}
          benchmarks={(competitorBenchmarks ?? []) as CompetitorBenchmark[]}
          competitors={competitors ?? []}
        />
      </div>
    </div>
  );
}
