// Analytics audit (2026-08-27) Phase 3: retention_drop_timestamp is
// free text (e.g. "2:15"), the same loose format the old, now-retired
// per-item field always used (docs/builder-brief.md: "timestamp + short
// note on what was happening there") - not a strict duration type,
// parsed defensively here so unparseable text just gets excluded from
// the trend rather than erroring the whole Analytics page.
export function parseRetentionDropSeconds(text: string | null): number | null {
  if (!text) return null;
  const parts = text.trim().split(":");
  if (parts.length === 0 || parts.length > 3) return null;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isFinite(n) || n < 0)) return null;
  return nums.reduce((total, n) => total * 60 + n, 0);
}

export function formatSecondsAsTimestamp(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const mm = String(m).padStart(h > 0 ? 2 : 1, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export type RetentionSnapshotInput = {
  snapshot_date: string;
  retention_drop_timestamp: string | null;
};

export type RetentionDropPost = {
  content_id: string;
  final_title: string | null;
  platform: string;
  content_platform_stats_snapshots: RetentionSnapshotInput[];
};

export type RetentionDropPoint = { date: string; seconds: number; rawText: string };

export type RetentionDropTrend = {
  contentId: string;
  finalTitle: string;
  platform: string;
  points: RetentionDropPoint[];
  direction: "improving" | "worsening" | "flat";
};

// One row per platform-post with at least two comparable check-ins - a
// single reading has nothing to trend against yet, so it only shows up
// once a second one exists. Direction compares the earliest reading to
// the latest: a later drop point (more seconds in) means viewers
// watched further before dropping off, i.e. improving.
export function computeRetentionDropTrends(posts: RetentionDropPost[]): RetentionDropTrend[] {
  const trends: RetentionDropTrend[] = [];

  for (const post of posts) {
    const points = post.content_platform_stats_snapshots
      .map((s) => {
        const seconds = parseRetentionDropSeconds(s.retention_drop_timestamp);
        return seconds === null
          ? null
          : { date: s.snapshot_date, seconds, rawText: s.retention_drop_timestamp as string };
      })
      .filter((p): p is RetentionDropPoint => p !== null)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (points.length < 2) continue;

    const first = points[0].seconds;
    const last = points[points.length - 1].seconds;
    const direction = last > first ? "improving" : last < first ? "worsening" : "flat";

    trends.push({
      contentId: post.content_id,
      finalTitle: post.final_title || "Untitled",
      platform: post.platform,
      points,
      direction,
    });
  }

  return trends;
}
