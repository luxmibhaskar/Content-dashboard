"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { findPlatformIcon } from "@/lib/platform-icons";
import { postStreakVisibility, shuffleVisibility, walkStreakVisibility } from "@/lib/shuffle-visibility";
import type { Goal } from "@/lib/types";

const ROTATE_MS = 4000;

function progressLabel(goal: Goal) {
  if (goal.target_value === null || goal.target_value <= 0) return null;
  const current = goal.current_value ?? 0;
  return `${current.toLocaleString()}/${goal.target_value.toLocaleString()} reached`;
}

// Layout follow-up: streak/goals moved out of Dashboard's scrollable
// content into this compact, always-visible top-bar display (item 2 of
// the redesign). Display only, no editing here, that lives in the
// Streak & Goals modal now (src/components/streak-goals-modal.tsx,
// opened via onOpenGoalsModal, same consolidation that removed the old
// Platforms modal). Always expanded, never collapsible (confirmed). With
// more than one goal, shuffles through them one at a time rather than
// cramming every platform into the bar at once (confirmed, ~4s per
// platform). Walk streak, Posting streak, and the platform shuffle each
// have their own independent visibility toggle in the Streak & Goals
// modal (src/lib/shuffle-visibility.ts), hiding one never affects the
// others.
//
// Second layout follow-up: no longer its own bordered row, this now
// renders as inline content on the left side of the main top-bar row
// (src/components/top-bar.tsx), alongside the repositioned nav on the
// right. No wrapping border/centering of its own anymore, the parent
// row's own layout (justify-between) handles that.
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
    shuffleVisibility.subscribe,
    shuffleVisibility.getSnapshot,
    shuffleVisibility.getServerSnapshot,
  );
  const walkStreakVisible = useSyncExternalStore(
    walkStreakVisibility.subscribe,
    walkStreakVisibility.getSnapshot,
    walkStreakVisibility.getServerSnapshot,
  );
  const postStreakVisible = useSyncExternalStore(
    postStreakVisibility.subscribe,
    postStreakVisibility.getSnapshot,
    postStreakVisibility.getServerSnapshot,
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
    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
      {walkStreakVisible && (
        <span>
          Walk streak: <span className="font-medium text-foreground">{walkStreak}</span>
        </span>
      )}
      {postStreakVisible && (
        <span>
          Posting streak: <span className="font-medium text-foreground">{postStreak}</span>
        </span>
      )}
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
