"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/glow-card";
import { PlatformIconPicker } from "@/components/streak-goals/platform-icon-picker";
import { findPlatformIcon } from "@/lib/platform-icons";
import { isViewsGoal, isYouTubeGoal } from "@/lib/goals";
import { updateGoal, deleteGoal } from "@/app/actions/goals";
import { logPastPlatformSnapshot } from "@/app/actions/platforms";
import { todayDateKey } from "@/lib/streaks";
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

export function PlatformGoalCard({ goal }: { goal: Goal }) {
  const [isPending, startTransition] = useTransition();
  const [backfillOpen, setBackfillOpen] = useState(false);
  const [isBackfillPending, startBackfillTransition] = useTransition();
  const boundUpdate = updateGoal.bind(null, goal.id);
  const boundDelete = deleteGoal.bind(null, goal.id);
  const boundLogPast = logPastPlatformSnapshot.bind(null, goal.platform_name ?? "");
  const iconEntry = findPlatformIcon(goal.icon_slug);
  // Views is the one distinct case, that number comes from Analytics,
  // not something to manually log here. Every other platform's current
  // count is editable and writes a platform_snapshots row on save
  // (src/app/actions/goals.ts), the single source of truth for it now.
  const isViews = isViewsGoal(goal.platform_name);
  // GROUP J: YouTube's number can auto-update from the Data API. Show the
  // channel-id field when this is the YouTube goal, or whenever one's
  // already saved (so renaming the platform never strands the value).
  const showSourceRef = isYouTubeGoal(goal.platform_name) || !!goal.source_ref;
  const label = progressLabel(goal);

  return (
    <GlowCard neutral className="p-4">
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

        {showSourceRef && (
          <div>
            <label className="text-xs text-muted-foreground">
              YouTube channel ID or @handle (for auto-update)
            </label>
            <Input
              name="source_ref"
              defaultValue={goal.source_ref ?? ""}
              placeholder="UCxxxxxxxx or @handle"
              className="h-8 text-sm"
            />
          </div>
        )}

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
              disabled={isViews}
              title={isViews ? "Pulled automatically from Analytics" : undefined}
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
                "h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm",
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

      {/* Item 2 of this follow-up: seeding real historical data for a
          platform that's only just being added, same spirit as the
          streak backfill, a real date input rather than only ever
          accumulating forward from today. Not shown for Views, that
          number isn't something to snapshot into platform_snapshots.
          Not its own GlowCard, this already lives inside one. */}
      {!isViews && (
        <div className="mt-3 border-t border-border pt-3">
          <button
            type="button"
            onClick={() => setBackfillOpen((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Log a past count {backfillOpen ? "−" : "+"}
          </button>
          {backfillOpen && (
            <form
              action={(formData) => startBackfillTransition(() => boundLogPast(formData))}
              className="mt-2 flex flex-wrap items-center gap-2"
            >
              <input
                type="date"
                name="snapshot_date"
                max={todayDateKey()}
                required
                className="h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
              />
              <Input name="count" type="number" min={0} placeholder="Count" className="h-8 w-28 text-sm" />
              <Button type="submit" size="xs" variant="outline" loading={isBackfillPending}>
                Save
              </Button>
            </form>
          )}
        </div>
      )}
    </GlowCard>
  );
}
