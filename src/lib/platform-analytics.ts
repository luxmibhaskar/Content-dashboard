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

export type PostCurrentStats = { views: number; engagement: number };

export function currentStatsOf(post: ContentPlatformPostWithSnapshots): PostCurrentStats {
  const latest = latestSnapshot(post.content_platform_stats_snapshots);
  if (!latest) return { views: 0, engagement: 0 };
  return { views: latest.views ?? 0, engagement: engagementOfSnapshot(latest) };
}

// One content item can have several platform-posts (one per platform it
// went out on); this sums each one's current stats into that item's
// total, keyed by content_id.
export function aggregateByContentId(
  posts: ContentPlatformPostWithSnapshots[],
): Map<string, PostCurrentStats> {
  const map = new Map<string, PostCurrentStats>();
  for (const post of posts) {
    const current = currentStatsOf(post);
    const entry = map.get(post.content_id) ?? { views: 0, engagement: 0 };
    entry.views += current.views;
    entry.engagement += current.engagement;
    map.set(post.content_id, entry);
  }
  return map;
}

// Grand total across every platform-post passed in, no per-item
// grouping - the Streak & Goals "Views" pseudo-goal and its Sheets
// backup mirror (src/app/(app)/layout.tsx, src/lib/backup.ts) both want
// one brand-wide number, not a per-item breakdown.
export function totalAcrossPosts(posts: ContentPlatformPostWithSnapshots[]): PostCurrentStats {
  let views = 0;
  let engagement = 0;
  for (const post of posts) {
    const current = currentStatsOf(post);
    views += current.views;
    engagement += current.engagement;
  }
  return { views, engagement };
}
