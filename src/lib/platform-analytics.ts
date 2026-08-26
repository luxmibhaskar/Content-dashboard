// docs/platform-performance-tracking.md's Migration section: the shared
// aggregation every Phase A dependent now reads through instead of
// content_calendar.views/likes/comments/shares/saves. Conversions has no
// equivalent field anywhere in this new model (confirmed deliberate, not
// an oversight, when Phase B's own migration was written from the doc's
// Section 2 field list) and stays sourced from the old column until
// Phase G decides what to do about it, not migrated here.
//
// "Current" for a platform-post means its latest snapshot by date, the
// same "most recent logged count wins" rule platform_snapshots already
// uses for brand-level follower counts (getLatestPlatformSnapshots,
// src/app/actions/platforms.ts) - a snapshot is a cumulative count as of
// that check-in, not a delta, so summing every snapshot ever logged
// would wildly overcount. A content item's total is the sum of its
// platform-posts' latest snapshots, one per platform it's actually been
// posted to.
export type PlatformStatsSnapshot = {
  snapshot_date: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  saves: number | null;
  shares: number | null;
  reposts: number | null;
};

export type ContentPlatformPostWithSnapshots = {
  content_id: string;
  platform: string;
  published_at: string;
  content_platform_stats_snapshots: PlatformStatsSnapshot[];
};

export function engagementOfSnapshot(s: PlatformStatsSnapshot): number {
  return (s.likes ?? 0) + (s.comments ?? 0) + (s.saves ?? 0) + (s.shares ?? 0) + (s.reposts ?? 0);
}

function latestSnapshot(snapshots: PlatformStatsSnapshot[]): PlatformStatsSnapshot | null {
  if (snapshots.length === 0) return null;
  return [...snapshots].sort((a, b) => b.snapshot_date.localeCompare(a.snapshot_date))[0];
}

// Analytics audit (2026-08-27), Phase 1: null and 0 used to mean the
// same thing here - a post with no check-in logged yet and a post
// genuinely checked in at zero views both collapsed to {views: 0}, so
// every KPI/chart downstream showed a misleading zero instead of hiding
// gracefully, exactly the anti-pattern this app's own "leave blank if
// not tracked" convention (conversions, the old flat columns) warns
// against. null now means "no snapshot logged yet", a real number
// (including a real 0) means "checked in, this is the count".
export type PostCurrentStats = { views: number | null; engagement: number | null };

export function currentStatsOf(post: ContentPlatformPostWithSnapshots): PostCurrentStats {
  const latest = latestSnapshot(post.content_platform_stats_snapshots);
  if (!latest) return { views: null, engagement: null };
  return { views: latest.views ?? 0, engagement: engagementOfSnapshot(latest) };
}

// One content item can have several platform-posts (one per platform it
// went out on); this sums each one's current stats into that item's
// total, keyed by content_id. An untracked post (no check-in yet)
// contributes nothing to the sum rather than 0, but doesn't erase a
// sibling post's real data either - only if NONE of an item's posts
// have ever been checked in does the item's own total come back null.
export function aggregateByContentId(
  posts: ContentPlatformPostWithSnapshots[],
): Map<string, PostCurrentStats> {
  const totals = new Map<string, { views: number; engagement: number; hasData: boolean }>();
  for (const post of posts) {
    const current = currentStatsOf(post);
    const entry = totals.get(post.content_id) ?? { views: 0, engagement: 0, hasData: false };
    if (current.views !== null) {
      entry.views += current.views;
      entry.engagement += current.engagement ?? 0;
      entry.hasData = true;
    }
    totals.set(post.content_id, entry);
  }
  const map = new Map<string, PostCurrentStats>();
  for (const [contentId, entry] of totals) {
    map.set(contentId, entry.hasData ? { views: entry.views, engagement: entry.engagement } : { views: null, engagement: null });
  }
  return map;
}

// Grand total across every platform-post passed in, no per-item
// grouping - the Streak & Goals "Views" pseudo-goal and its Sheets
// backup mirror (src/app/(app)/layout.tsx, src/lib/backup.ts) both want
// one brand-wide number, not a per-item breakdown. Same null-means-
// nothing-tracked-yet rule as aggregateByContentId; those two call
// sites coalesce it to 0 themselves since a goal progress bar has no
// "hide gracefully" state the way an Analytics KPI card does.
export function totalAcrossPosts(posts: ContentPlatformPostWithSnapshots[]): PostCurrentStats {
  let views = 0;
  let engagement = 0;
  let hasData = false;
  for (const post of posts) {
    const current = currentStatsOf(post);
    if (current.views !== null) {
      views += current.views;
      engagement += current.engagement ?? 0;
      hasData = true;
    }
  }
  return hasData ? { views, engagement } : { views: null, engagement: null };
}
