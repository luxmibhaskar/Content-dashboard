"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { addGoal, updateGoal, deleteGoal } from "@/app/actions/goals";
import { TARGET_METRIC_OPTIONS, GOAL_STATUSES, type Goal } from "@/lib/types";

const STATUS_COLOR: Record<string, string> = {
  "On Track": "text-emerald-600",
  Behind: "text-amber-600",
  Achieved: "text-emerald-600",
  Abandoned: "text-zinc-400",
};

function progressPercent(goal: Goal) {
  if (!goal.target_value || goal.target_value <= 0) return null;
  const current = goal.current_value ?? 0;
  return Math.min(100, Math.round((current / goal.target_value) * 100));
}

// Section 6.5: 2-3 active goals at a time is the realistic use case, so
// this stays a small strip on Today rather than a dashboard of its own,
// quiet by default (mirrors StreakStrip), expands on click for the
// inline add/edit/delete forms.
export function GoalProgressStrip({ goals }: { goals: Goal[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="text-sm text-muted-foreground">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex flex-wrap items-center gap-x-4 gap-y-1 hover:text-foreground"
      >
        {goals.length === 0 && <span>No goals set yet (add one)</span>}
        {goals.map((g) => {
          const pct = progressPercent(g);
          return (
            <span key={g.id}>
              {g.goal_text}
              {pct !== null && (
                <span className="font-medium text-foreground"> {pct}%</span>
              )}
            </span>
          );
        })}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {goals.map((g) => {
            const pct = progressPercent(g);
            const boundUpdate = updateGoal.bind(null, g.id);
            const boundDelete = deleteGoal.bind(null, g.id);
            const isViews = g.target_metric === "Views";
            return (
              <form
                key={g.id}
                action={(formData) => startTransition(() => boundUpdate(formData))}
                className="rounded-md border border-border p-3 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <Input
                    name="goal_text"
                    defaultValue={g.goal_text}
                    className="h-7 text-xs font-medium text-foreground"
                  />
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => startTransition(() => boundDelete())}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    Delete
                  </button>
                </div>

                {pct !== null && (
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}

                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <select
                    name="target_metric"
                    defaultValue={g.target_metric ?? ""}
                    className="h-7 rounded-md border border-input bg-background px-1.5 text-xs"
                  >
                    <option value="">Metric...</option>
                    {TARGET_METRIC_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <Input
                    name="target_value"
                    type="number"
                    defaultValue={g.target_value ?? ""}
                    placeholder="Target"
                    className="h-7 text-xs"
                  />
                  {isViews ? (
                    <Input
                      disabled
                      value={g.current_value ?? 0}
                      title="Pulled automatically from Analytics"
                      className="h-7 text-xs"
                    />
                  ) : (
                    <Input
                      name="current_value"
                      type="number"
                      defaultValue={g.current_value ?? ""}
                      placeholder="Current"
                      className="h-7 text-xs"
                    />
                  )}
                  <Input
                    name="target_date"
                    type="date"
                    defaultValue={g.target_date ?? ""}
                    className="h-7 text-xs"
                  />
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <select
                    name="status"
                    defaultValue={g.status}
                    className={cn(
                      "h-7 rounded-md border border-input bg-background px-1.5 text-xs",
                      STATUS_COLOR[g.status],
                    )}
                  >
                    {GOAL_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" size="xs" variant="outline" disabled={isPending}>
                    Save
                  </Button>
                </div>
              </form>
            );
          })}

          <form
            action={(formData) => startTransition(() => addGoal(formData))}
            className="rounded-md border border-dashed border-border p-3 text-xs"
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input name="goal_text" placeholder="e.g. Reach 10,000 subscribers" className="h-7 text-xs" />
              <select
                name="target_metric"
                defaultValue=""
                className="h-7 rounded-md border border-input bg-background px-1.5 text-xs"
              >
                <option value="">Metric...</option>
                {TARGET_METRIC_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <Input name="target_value" type="number" placeholder="Target value" className="h-7 text-xs" />
              <Input name="target_date" type="date" className="h-7 text-xs" />
            </div>
            <Button type="submit" size="xs" variant="outline" className="mt-2" disabled={isPending}>
              Add goal
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
