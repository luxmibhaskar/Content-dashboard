"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { findPlatformIcon } from "@/lib/platform-icons";
import { postStreakVisibility, shuffleVisibility, walkStreakVisibility } from "@/lib/shuffle-visibility";
import { WALK_STREAK_LABEL } from "@/lib/streaks";
import type { Brand } from "@/lib/brand";
import type { Goal } from "@/lib/types";

// Top bar (docs/dashboard-redesign.md "Layout follow-ups"): the three
// streak/goals items used to live entirely inside StreakGoalsBar. They're
// now shown inline in the adaptive bar behind the "Streak and Goals"
// toggle, so their rendering plus the ~4s shuffle rotation and the three
// visibility toggles are lifted here. Each item exposes its inline
// `barNode` and its own `visible` flag; the array is already in
// left-to-right order. StreakGoalsBar itself is untouched and still used
// as-is by the mobile panel.
//
// The toggle-open row hard-caps at one line via a priority overflow
// collapse (top-bar.tsx). That needs the widths of every item. The
// shuffle item's text rotates every ~4s and each goal is a different
// width, so instead of chasing the rotation the row reserves the widest
// goal's width: `shuffleVariants` is a node per candidate goal, all
// measured off the offscreen rig, and the collapse maths uses the max.
// `measureSignature` changes whenever any measured text would change
// width (streak counts, the goal set, brand, visibility), so the rig
// re-measures then and only then.

const ROTATE_MS = 4000;

export type StreakItemId = "walk-streak" | "post-streak" | "shuffle";

export type StreakItem = {
  id: StreakItemId;
  /** per-user visibility toggle (shuffle-visibility.ts) */
  visible: boolean;
  barNode: ReactNode;
};

export type UseStreakItems = {
  items: StreakItem[];
  /** one non-interactive node per shuffle candidate (each goal, or the
   *  empty-state prompt); the row reserves the widest of these. */
  shuffleVariants: { id: string; node: ReactNode }[];
  /** changes iff a measured streak width could have changed */
  measureSignature: string;
};

function progressLabel(goal: Goal) {
  if (goal.target_value === null || goal.target_value <= 0) return null;
  const current = goal.current_value ?? 0;
  return `${current.toLocaleString()}/${goal.target_value.toLocaleString()} reached`;
}

function goalNode(goal: Goal) {
  const iconEntry = findPlatformIcon(goal.icon_slug);
  return (
    <span className="flex items-center gap-1.5">
      {iconEntry && <iconEntry.Icon className="size-3.5" aria-hidden="true" />}
      <span className="font-medium text-foreground">{goal.platform_name}</span>
      {progressLabel(goal)}
    </span>
  );
}

export function useStreakItems({
  brand,
  walkStreak,
  postStreak,
  goals,
  onOpenGoalsModal,
}: {
  brand: Brand;
  walkStreak: number;
  postStreak: number;
  goals: Goal[];
  onOpenGoalsModal: () => void;
}): UseStreakItems {
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
  const walkLabel = WALK_STREAK_LABEL[brand].short;

  const items: StreakItem[] = [
    {
      id: "walk-streak",
      visible: walkStreakVisible,
      barNode: (
        <span>
          {walkLabel}: <span className="font-medium text-foreground">{walkStreak}</span>
        </span>
      ),
    },
    {
      id: "post-streak",
      visible: postStreakVisible,
      barNode: (
        <span>
          Posting streak: <span className="font-medium text-foreground">{postStreak}</span>
        </span>
      ),
    },
    {
      id: "shuffle",
      visible: shuffleVisible,
      barNode: current ? (
        goalNode(current)
      ) : (
        <button
          type="button"
          onClick={onOpenGoalsModal}
          className="hover:text-foreground hover:underline"
        >
          Add a platform goal &rarr;
        </button>
      ),
    },
  ];

  const shuffleVariants =
    withProgress.length === 0
      ? [{ id: "empty", node: <span>Add a platform goal &rarr;</span> }]
      : withProgress.map((g) => ({ id: g.id, node: goalNode(g) }));

  const measureSignature = [
    brand,
    walkStreak,
    postStreak,
    walkStreakVisible,
    postStreakVisible,
    shuffleVisible,
    withProgress.length === 0
      ? "empty"
      : withProgress
          .map((g) => `${g.id}:${g.current_value ?? 0}/${g.target_value}:${g.platform_name}`)
          .join(","),
  ].join("|");

  return { items, shuffleVariants, measureSignature };
}
