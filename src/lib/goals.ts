import type { Goal } from "@/lib/types";

// Platforms/Streak & Goals consolidation: platform_snapshots is now the
// single source of truth for every platform goal's current count, any
// platform name, not just a fixed 4. goals.current_value is never
// written for a platform goal going forward (stays in the schema for
// old rows only, superseded). "views" (case-insensitive, exact) is the
// one distinct case left, it isn't a platform count, it pulls from
// Analytics' summed content_calendar.views instead.
export function isViewsGoal(platformName: string | null): boolean {
  return (platformName ?? "").trim().toLowerCase() === "views";
}

export function resolveGoalCurrentValues(
  goals: Goal[],
  totalViews: number,
  latestSnapshotsByPlatform: Record<string, number>,
): Goal[] {
  return goals.map((g) => {
    if (isViewsGoal(g.platform_name)) {
      return { ...g, current_value: totalViews };
    }
    if (g.platform_name && g.platform_name in latestSnapshotsByPlatform) {
      return { ...g, current_value: latestSnapshotsByPlatform[g.platform_name] };
    }
    return { ...g, current_value: null };
  });
}
