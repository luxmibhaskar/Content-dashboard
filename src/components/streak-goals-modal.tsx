"use client";

import { useState } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StreakLogForm } from "@/components/streak-goals/streak-log-form";
import { PlatformGoalCard } from "@/components/streak-goals/platform-goal-card";
import { AddPlatformGoalForm } from "@/components/streak-goals/add-platform-goal-form";
import type { Goal } from "@/lib/types";

type Tab = "streak" | "goals";

// Platforms/Streak & Goals consolidation: replaces both the old
// Platforms modal (removed entirely) and the dedicated /streaks-goals
// page (also removed) with one pop-out, in the same top-bar spot
// Platforms used to occupy. Fully externally controlled (open/
// onOpenChange, no Dialog.Trigger of its own) since it needs to open
// from more than one place: the "More" menu item and the top-bar
// shuffle display's empty-state prompt (both in
// src/components/top-bar.tsx). Two tabs rather than one long flat
// scroll, this is genuinely a lot to fit in a modal: logging (today +
// backfill) and full goal CRUD are different tasks, not one continuous
// flow.
export function StreakGoalsModal({
  open,
  onOpenChange,
  walkStreak,
  postStreak,
  todayWalked,
  todayPosted,
  goals,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walkStreak: number;
  postStreak: number;
  todayWalked: boolean;
  todayPosted: boolean;
  goals: Goal[];
}) {
  const [tab, setTab] = useState<Tab>("streak");

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-popover p-5 text-popover-foreground shadow-lg">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">Streak and Goals</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" aria-label="Close" className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            Walk streak: <span className="font-medium text-foreground">{walkStreak}</span>{" "}
            &middot; Posting streak: <span className="font-medium text-foreground">{postStreak}</span>
          </Dialog.Description>

          <div className="mt-4 inline-flex items-center gap-0.5 rounded-lg border border-border p-0.5">
            <Button
              type="button"
              size="sm"
              variant={tab === "streak" ? "default" : "ghost"}
              onClick={() => setTab("streak")}
            >
              Log Streak
            </Button>
            <Button
              type="button"
              size="sm"
              variant={tab === "goals" ? "default" : "ghost"}
              onClick={() => setTab("goals")}
            >
              Goals
            </Button>
          </div>

          <div className={tab === "streak" ? "mt-4" : "mt-4 hidden"}>
            <StreakLogForm todayWalked={todayWalked} todayPosted={todayPosted} />
          </div>

          <div className={tab === "goals" ? "mt-4 space-y-3" : "mt-4 hidden"}>
            {goals.map((g, i) => (
              <PlatformGoalCard key={g.id} goal={g} glow={((i % 3) + 1) as 1 | 2 | 3} />
            ))}
            {goals.length === 0 && (
              <p className="text-sm text-muted-foreground">No goals yet, add your first one below.</p>
            )}
            <AddPlatformGoalForm />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
