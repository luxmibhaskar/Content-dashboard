"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { findPlatformIcon } from "@/lib/platform-icons";
import type { Goal } from "@/lib/types";

const ROTATE_MS = 4000;

function progressLabel(goal: Goal) {
  if (goal.target_value === null || goal.target_value <= 0) return null;
  const current = goal.current_value ?? 0;
  return `${current.toLocaleString()}/${goal.target_value.toLocaleString()} reached`;
}

// Layout follow-up: streak/goals moved out of Dashboard's scrollable
// content into this compact, always-visible top-bar row (item 2 of the
// redesign). Display only, no editing here, that's all on
// /streaks-goals now (item 3). Always expanded, never collapsible
// (confirmed). With more than one goal, shuffles through them one at a
// time rather than cramming every platform into the bar at once
// (confirmed, ~4s per platform).
export function StreakGoalsBar({
  walkStreak,
  postStreak,
  goals,
}: {
  walkStreak: number;
  postStreak: number;
  goals: Goal[];
}) {
  const withProgress = goals.filter((g) => progressLabel(g) !== null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (withProgress.length < 2) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % withProgress.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [withProgress.length]);

  const current = withProgress[index % withProgress.length] ?? null;
  const iconEntry = current ? findPlatformIcon(current.icon_slug) : undefined;

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 border-b border-border px-4 py-2 text-sm text-muted-foreground">
      <span>
        Walk streak: <span className="font-medium text-foreground">{walkStreak}</span>
      </span>
      <span>
        Posting streak: <span className="font-medium text-foreground">{postStreak}</span>
      </span>
      {current ? (
        <span className="flex items-center gap-1.5">
          {iconEntry && <iconEntry.Icon className="size-3.5" aria-hidden="true" />}
          <span className="font-medium text-foreground">{current.platform_name}</span>
          {progressLabel(current)}
        </span>
      ) : (
        <Link href="/streaks-goals" className="hover:text-foreground hover:underline">
          Add a platform goal &rarr;
        </Link>
      )}
    </div>
  );
}
