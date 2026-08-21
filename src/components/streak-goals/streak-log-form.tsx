"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/glow-card";
import { logStreakEntry } from "@/app/actions/streaks";
import { todayDateKey } from "@/lib/streaks";

// Streak & Goals redesign: relocated off the old StreakStrip's inline
// popover (that component is gone, this page holds all the actual
// editing now). Two distinct entry points sharing one action
// (logStreakEntry): a one-tap "log today" form, and a "log a past day"
// toggle exposing a real date input for backfilling a forgotten day,
// rather than only ever being able to log for today.
export function StreakLogForm({
  todayWalked,
  todayPosted,
}: {
  todayWalked: boolean;
  todayPosted: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [backfillOpen, setBackfillOpen] = useState(false);
  const [isBackfillPending, startBackfillTransition] = useTransition();

  return (
    <div className="space-y-4">
      <GlowCard glow={1} className="p-4">
        <p className="text-sm font-medium">Log today</p>
        <form
          action={(formData) => startTransition(() => logStreakEntry(formData))}
          className="mt-2 flex flex-wrap items-center gap-4"
        >
          <input type="hidden" name="streak_date" value={todayDateKey()} />
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" name="walked" defaultChecked={todayWalked} className="size-3.5" />
            Walked today?
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" name="posted" defaultChecked={todayPosted} className="size-3.5" />
            Posted today?
          </label>
          <Button type="submit" size="sm" loading={isPending}>
            Save
          </Button>
        </form>
      </GlowCard>

      <GlowCard glow={2} className="p-4">
        <button
          type="button"
          onClick={() => setBackfillOpen((v) => !v)}
          className="text-sm font-medium hover:text-muted-foreground"
        >
          Log a past day {backfillOpen ? "−" : "+"}
        </button>
        {backfillOpen && (
          <form
            action={(formData) => startBackfillTransition(() => logStreakEntry(formData))}
            className="mt-3 flex flex-wrap items-center gap-4"
          >
            <input
              type="date"
              name="streak_date"
              max={todayDateKey()}
              required
              className="h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
            />
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="walked" className="size-3.5" />
              Walked?
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="posted" className="size-3.5" />
              Posted?
            </label>
            <Button type="submit" size="sm" variant="outline" loading={isBackfillPending}>
              Save
            </Button>
          </form>
        )}
      </GlowCard>
    </div>
  );
}
