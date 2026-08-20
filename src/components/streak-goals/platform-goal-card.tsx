"use client";

import { useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/glow-card";
import { PlatformIconPicker } from "@/components/streak-goals/platform-icon-picker";
import { findPlatformIcon } from "@/lib/platform-icons";
import { matchedAutoPullPlatform, isViewsGoal } from "@/lib/goals";
import { updateGoal, deleteGoal } from "@/app/actions/goals";
import { GOAL_STATUSES, type Goal } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_COLOR: Record<string, string> = {
  "On Track": "text-emerald-600",
  Behind: "text-amber-600",
  Achieved: "text-emerald-600",
  Abandoned: "text-zinc-400",
};

// Item 4 of the redesign: a plain count, not a percentage or abstract
// indicator, "3,747/10,000 reached".
function progressLabel(goal: Goal) {
  if (goal.target_value === null || goal.target_value <= 0) return null;
  const current = goal.current_value ?? 0;
  return `${current.toLocaleString()}/${goal.target_value.toLocaleString()} reached`;
}

export function PlatformGoalCard({ goal, glow = 1 }: { goal: Goal; glow?: 1 | 2 | 3 }) {
  const [isPending, startTransition] = useTransition();
  const boundUpdate = updateGoal.bind(null, goal.id);
  const boundDelete = deleteGoal.bind(null, goal.id);
  const iconEntry = findPlatformIcon(goal.icon_slug);
  const isAutoPull = isViewsGoal(goal.platform_name) || matchedAutoPullPlatform(goal.platform_name) !== null;
  const label = progressLabel(goal);

  return (
    <GlowCard glow={glow} className="p-4">
      <form action={(formData) => startTransition(() => boundUpdate(formData))} className="space-y-3">
        <div className="flex items-center gap-2">
          <PlatformIconPicker name="icon_slug" defaultSlug={goal.icon_slug} />
          <Input
            name="platform_name"
            defaultValue={goal.platform_name ?? ""}
            placeholder="Platform name (e.g. Instagram, Newsletter...)"
            required
            className="text-sm font-medium"
          />
          {iconEntry && (
            <iconEntry.Icon className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
          )}
        </div>

        {label && <p className="text-lg font-semibold">{label}</p>}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="text-xs text-muted-foreground">Target</label>
            <Input name="target_value" type="number" defaultValue={goal.target_value ?? ""} className="h-8 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Current</label>
            <Input
              name="current_value"
              type="number"
              defaultValue={goal.current_value ?? ""}
              disabled={isAutoPull}
              title={isAutoPull ? "Pulled automatically, logged elsewhere in the app" : undefined}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Target date</label>
            <Input name="target_date" type="date" defaultValue={goal.target_date ?? ""} className="h-8 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Status</label>
            <select
              name="status"
              defaultValue={goal.status}
              className={cn(
                "h-8 w-full rounded-md border border-input bg-background px-2 text-sm",
                STATUS_COLOR[goal.status],
              )}
            >
              {GOAL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            size="xs"
            variant="ghost"
            loading={isPending}
            onClick={() => startTransition(() => boundDelete())}
            className="text-muted-foreground hover:text-destructive"
          >
            Delete
          </Button>
          <Button type="submit" size="sm" variant="outline" loading={isPending}>
            Save
          </Button>
        </div>
      </form>
    </GlowCard>
  );
}
