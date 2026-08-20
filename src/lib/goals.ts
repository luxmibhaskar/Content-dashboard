import { PLATFORMS, type Platform } from "@/lib/platforms";
import type { Goal } from "@/lib/types";

// Streak & Goals redesign: a platform goal's current_value auto-pulls
// from data already tracked elsewhere when its platform_name matches a
// known source, same pattern the old Views-only special case used,
// generalized. "views" (case-insensitive, exact) pulls from Analytics'
// summed content_calendar.views; an exact PLATFORMS match (Instagram,
// TikTok, Threads, Facebook, case-insensitive) pulls from the latest
// platform_snapshots row for that platform. Anything else is a
// genuinely custom platform, current_value stays manual entry.
export function matchedAutoPullPlatform(platformName: string | null): Platform | null {
  if (!platformName) return null;
  const name = platformName.trim().toLowerCase();
  return PLATFORMS.find((p) => p.toLowerCase() === name) ?? null;
}

export function isViewsGoal(platformName: string | null): boolean {
  return (platformName ?? "").trim().toLowerCase() === "views";
}

export function resolveGoalCurrentValues(
  goals: Goal[],
  totalViews: number,
  latestPlatformCounts: Partial<Record<Platform, number>>,
): Goal[] {
  return goals.map((g) => {
    if (isViewsGoal(g.platform_name)) {
      return { ...g, current_value: totalViews };
    }
    const matched = matchedAutoPullPlatform(g.platform_name);
    if (matched && latestPlatformCounts[matched] !== undefined) {
      return { ...g, current_value: latestPlatformCounts[matched] ?? null };
    }
    return g;
  });
}
