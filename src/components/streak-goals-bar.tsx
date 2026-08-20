"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { findPlatformIcon } from "@/lib/platform-icons";
import {
  getServerShuffleVisibleSnapshot,
  getShuffleVisibleSnapshot,
  subscribeToShuffleVisible,
} from "@/lib/shuffle-visibility";
import type { Goal } from "@/lib/types";

const ROTATE_MS = 4000;

function progressLabel(goal: Goal) {
  if (goal.target_value === null || goal.target_value <= 0) return null;
  const current = goal.current_value ?? 0;
  return `${current.toLocaleString()}/${goal.target_value.toLocaleString()} reached`;
}

// Layout follow-up: streak/goals moved out of Dashboard's scrollable
// content into this compact, always-visible top-bar row (item 2 of the
// redesign). Display only, no editing here, that lives in the Streak &
// Goals modal now (src/components/streak-goals-modal.tsx, opened via
// onOpenGoalsModal, same consolidation that removed the old Platforms
// modal). Always expanded, never collapsible (confirmed). With more
// than one goal, shuffles through them one at a time rather than
// cramming every platform into the bar at once (confirmed, ~4s per
// platform).
export function StreakGoalsBar({
  walkStreak,
  postStreak,
  goals,
  onOpenGoalsModal,
}: {
  walkStreak: number;
  postStreak: number;
  goals: Goal[];
  onOpenGoalsModal: () => void;
}) {
  const shuffleVisible = useSyncExternalStore(
    subscribeToShuffleVisible,
    getShuffleVisibleSnapshot,
    getServerShuffleVisibleSnapshot,
  );
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
      {shuffleVisible &&
        (current ? (
          <span className="flex items-center gap-1.5">
            {iconEntry && <iconEntry.Icon className="size-3.5" aria-hidden="true" />}
            <span className="font-medium text-foreground">{current.platform_name}</span>
            {progressLabel(current)}
          </span>
        ) : (
          <button type="button" onClick={onOpenGoalsModal} className="hover:text-foreground hover:underline">
            Add a platform goal &rarr;
          </button>
        ))}
    </div>
  );
}
