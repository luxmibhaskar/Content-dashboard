"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlowCard } from "@/components/glow-card";
import { CollapsibleSection } from "@/components/collapsible-section";
import { PerformanceOverTimeChart } from "@/components/charts/performance-over-time-chart";
import { todayDateKey } from "@/lib/streaks";
import {
  logPlatformStatsSnapshot,
  updatePlatformPostUrl,
  refreshYouTubeVideoStats,
} from "@/app/(app)/calendar/[id]/platform-stats-actions";
import { engagementOfSnapshot } from "@/lib/platform-analytics";
import { isYouTubeGoal } from "@/lib/goals";
import type { ContentPlatformPost } from "@/lib/types";
import type { OverTimePoint } from "@/lib/analytics";

function toOverTimePoints(post: ContentPlatformPost): OverTimePoint[] {
  return [...post.content_platform_stats_snapshots]
    .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))
    .map((s) => ({ date: s.snapshot_date, Views: s.views ?? 0, Engagement: engagementOfSnapshot(s) }));
}

// docs/platform-performance-tracking.md Section 4: per-item Analytics,
// directly below Production Status (the main form's own Save/
// ProductionStatusTracker row, immediately above this), one graph per
// platform the item has actually been posted to, sourced from
// content_platform_stats_snapshots. Section 5: collapsible, matching the
// existing pattern (CollapsibleSection, same component Analytics
// Overview's own Secondary Graphs uses). Outside the main form on
// purpose, same reasoning as TopicPageTabs: each platform's "Log a
// check-in" is its own tiny form, HTML doesn't allow nesting forms.
export function PlatformAnalyticsSection({
  contentId,
  brand,
  format,
  platforms,
  sourceItem,
  liveHook,
  conversions,
  formId,
}: {
  contentId: string;
  brand: string;
  format: string;
  platforms: ContentPlatformPost[];
  sourceItem: { id: string; final_title: string | null } | null;
  liveHook: { variant_text: string; performance_rating: number | null } | null;
  conversions: number | null;
  // Topic page restructuring (2026-08-27): Conversions moved here from
  // the old Performance Metrics section (now removed) since it's a
  // business outcome, not a platform engagement signal, and has no
  // per-platform equivalent among these check-ins. Stays part of the
  // main form's single atomic Save via the native form={formId}
  // attribute rather than nesting (this component isn't inside that
  // <form>, its own "Log a check-in" forms couldn't nest inside it
  // either way), see dirty-form-tracker.tsx's comment for the pattern.
  formId: string;
}) {
  return (
    <CollapsibleSection title="Analytics and Conversion" neutral>
      <div className="space-y-1.5">
        <Label htmlFor="conversions">Conversions</Label>
        <Input
          id="conversions"
          name="conversions"
          type="number"
          min={0}
          defaultValue={conversions ?? ""}
          form={formId}
          className="max-w-40"
        />
        <p className="text-xs text-muted-foreground">
          Leave blank if not tracked yet, that&apos;s different from entering 0, Analytics
          Overview hides KPIs it has no data for rather than showing a misleading zero.
        </p>
      </div>

      {format === "Short" && sourceItem && (
        <p className="text-sm text-muted-foreground">
          Idea derived from:{" "}
          <Link href={`/calendar/${sourceItem.id}`} className="font-medium text-foreground hover:underline">
            {sourceItem.final_title || "Untitled"}
          </Link>
        </p>
      )}

      {/* docs/platform-performance-tracking.md Sections 4 and 7: which
          hook was used and its performance. liveHook comes from
          hook_variants where is_live, set by useHook (hook-actions.ts,
          Manual Packaging's "Use" action) - Manual-only for now, AI's
          Packaging phase has no categorized hook fields to use from
          (confirmed before building Section 7, see hook-actions.ts). No
          rating UI exists anywhere yet (same as Hook Library's own
          aggregation), so "not yet rated" is the honest state, not a
          placeholder. */}
      {liveHook && (
        <p className="text-sm text-muted-foreground">
          Hook used: <span className="font-medium text-foreground">{liveHook.variant_text}</span>
          {" · "}
          {liveHook.performance_rating !== null
            ? `rated ${liveHook.performance_rating}/10`
            : "not yet rated"}
        </p>
      )}

      {platforms.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Not posted to any platform yet. Add one above in &quot;Posted on&quot; to start tracking
          performance here.
        </p>
      ) : (
        <div className="space-y-4">
          {platforms.map((post) => (
            <PlatformAnalyticsCard key={post.id} contentId={contentId} brand={brand} post={post} />
          ))}
        </div>
      )}
    </CollapsibleSection>
  );
}

function PlatformAnalyticsCard({
  contentId,
  brand,
  post,
}: {
  contentId: string;
  brand: string;
  post: ContentPlatformPost;
}) {
  const [logOpen, setLogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const boundLog = logPlatformStatsSnapshot.bind(null, post.id, contentId, brand);
  const points = toOverTimePoints(post);

  return (
    <GlowCard neutral className="p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{post.platform}</span>
        <span className="text-xs text-muted-foreground">
          Posted {new Date(post.published_at).toLocaleDateString()}
        </span>
      </div>

      {isYouTubeGoal(post.platform) && (
        <YouTubeVideoLink contentId={contentId} brand={brand} post={post} />
      )}

      <div className="mt-3">
        {points.length > 0 ? (
          <PerformanceOverTimeChart data={points} />
        ) : (
          <p className="text-sm text-muted-foreground">No check-ins logged yet for this platform.</p>
        )}
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <button
          type="button"
          onClick={() => setLogOpen((v) => !v)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Log a check-in {logOpen ? "−" : "+"}
        </button>
        {logOpen && (
          <form
            action={(formData) => startTransition(() => boundLog(formData))}
            className="mt-2 space-y-3"
          >
            {/* Retention drop leads the check-in: it's the qualitative
                "where/why did viewers leave" read, captured before
                rattling through the metric numbers rather than tacked
                on last. One reading per check-in
                (0020_retention_drop_check_ins.sql) so the drop point can
                be seen moving earlier/later over time
                (src/lib/retention-drop.ts, Analytics' Retention Drop
                Trends). Free text, same "timestamp + a short note" shape
                the old per-item field always used. */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Retention drop</p>
              <div className="flex flex-wrap items-end gap-2">
                <Input
                  name="retention_drop_timestamp"
                  type="text"
                  placeholder="Drop point, e.g. 2:15"
                  className="h-8 w-32 text-sm"
                />
                <Input
                  name="retention_drop_note"
                  type="text"
                  placeholder="What was happening there"
                  className="h-8 w-56 text-sm"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground" htmlFor={`snapshot_date-${post.id}`}>
                  Date
                </label>
                <input
                  id={`snapshot_date-${post.id}`}
                  type="date"
                  name="snapshot_date"
                  max={todayDateKey()}
                  defaultValue={todayDateKey()}
                  required
                  className="h-8 rounded-md border border-input bg-background px-2 py-1 text-sm"
                />
              </div>
              <Input name="views" type="number" min={0} placeholder="Views" className="h-8 w-24 text-sm" />
              <Input name="likes" type="number" min={0} placeholder="Likes" className="h-8 w-24 text-sm" />
              <Input name="comments" type="number" min={0} placeholder="Comments" className="h-8 w-24 text-sm" />
              <Input name="saves" type="number" min={0} placeholder="Saves" className="h-8 w-24 text-sm" />
              <Input name="shares" type="number" min={0} placeholder="Shares" className="h-8 w-24 text-sm" />
              <Input name="reposts" type="number" min={0} placeholder="Reposts" className="h-8 w-24 text-sm" />
              <Button type="submit" size="xs" variant="outline" loading={isPending}>
                Save
              </Button>
            </div>
          </form>
        )}
      </div>
    </GlowCard>
  );
}

// GROUP I: "paste the published YouTube URL once after publishing"
// becomes the reliable link (not automatic title-matching, titles can
// be edited and can collide, see updatePlatformPostUrl's own comment).
// Once a URL is saved, Refresh pulls that one video's view/like/comment
// counts and logs them as today's check-in, same table and same
// upsert-by-day rule the manual form below already uses, so a refresh
// and a same-day manual edit never conflict.
function YouTubeVideoLink({
  contentId,
  brand,
  post,
}: {
  contentId: string;
  brand: string;
  post: ContentPlatformPost;
}) {
  const [savePending, startSave] = useTransition();
  const [refreshPending, startRefresh] = useTransition();
  const [refreshMsg, setRefreshMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  // Investigation (2026-09-05): content_platform_posts.post_url has no
  // uniqueness, so the same video could otherwise get linked from two
  // different Calendar items (src/lib/duplicate-video.ts has the full
  // reasoning). Blocked by default with an explicit override per
  // instruction, rather than a hard block: pendingDuplicate holds the
  // warning plus the URL that triggered it, so "Save anyway" can
  // resubmit that same value with confirm_duplicate set, without asking
  // the user to retype it.
  const [pendingDuplicate, setPendingDuplicate] = useState<{ url: string; message: string } | null>(null);
  const boundSaveUrl = updatePlatformPostUrl.bind(null, post.id, contentId, brand);

  function submitUrl(url: string, confirmDuplicate: boolean) {
    startSave(async () => {
      const formData = new FormData();
      formData.set("post_url", url);
      if (confirmDuplicate) formData.set("confirm_duplicate", "true");
      const result = await boundSaveUrl(formData);
      if (result.ok) {
        setPendingDuplicate(null);
        return;
      }
      if (result.kind === "duplicate") {
        setPendingDuplicate({ url, message: result.error });
        return;
      }
      setPendingDuplicate(null);
      setRefreshMsg({ kind: "error", text: result.error });
    });
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const url = String(new FormData(e.currentTarget).get("post_url") ?? "").trim();
          submitUrl(url, false);
        }}
        className="flex flex-wrap items-end gap-2"
      >
        <div className="flex flex-1 min-w-48 flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor={`post_url-${post.id}`}>
            Video URL
          </label>
          <Input
            id={`post_url-${post.id}`}
            name="post_url"
            type="url"
            placeholder="https://youtube.com/watch?v=..."
            defaultValue={post.post_url ?? ""}
            className="h-8 text-sm"
          />
        </div>
        <Button type="submit" size="xs" variant="outline" loading={savePending}>
          Save link
        </Button>
        <Button
          type="button"
          size="xs"
          variant="outline"
          loading={refreshPending}
          onClick={() =>
            startRefresh(async () => {
              const res = await refreshYouTubeVideoStats(post.id, contentId, brand);
              setRefreshMsg(
                res.ok
                  ? { kind: "ok", text: `Updated to ${res.views.toLocaleString()} views` }
                  : { kind: "error", text: res.error },
              );
            })
          }
        >
          Refresh from YouTube
        </Button>
      </form>
      {pendingDuplicate && (
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="text-xs text-destructive">{pendingDuplicate.message}</span>
          <Button
            type="button"
            size="xs"
            variant="outline"
            loading={savePending}
            onClick={() => submitUrl(pendingDuplicate.url, true)}
          >
            Save anyway
          </Button>
        </div>
      )}
      {!pendingDuplicate && refreshMsg && (
        <span className={refreshMsg.kind === "ok" ? "text-xs text-emerald-600" : "text-xs text-destructive"}>
          {refreshMsg.text}
        </span>
      )}
    </div>
  );
}
