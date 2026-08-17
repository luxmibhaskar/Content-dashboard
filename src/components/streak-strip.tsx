"use client";

import { useState, useTransition } from "react";
import { logTodayStreak } from "@/app/actions/streaks";

export function StreakStrip({
  walkStreak,
  postStreak,
  todayLogged,
  todayWalked,
  todayPosted,
}: {
  walkStreak: number;
  postStreak: number;
  todayLogged: boolean;
  todayWalked: boolean;
  todayPosted: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="text-sm text-muted-foreground">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-4 hover:text-foreground"
      >
        <span>
          Walk streak: <span className="font-medium text-foreground">{walkStreak}</span>
        </span>
        <span>
          Posting streak: <span className="font-medium text-foreground">{postStreak}</span>
        </span>
        {!todayLogged && <span className="text-xs">(log today)</span>}
      </button>

      {open && (
        <form
          action={(formData) => startTransition(() => logTodayStreak(formData))}
          className="mt-2 flex items-center gap-4 rounded-md border border-border p-2 text-xs"
        >
          <label className="flex items-center gap-1.5">
            <input type="checkbox" name="walked" defaultChecked={todayWalked} className="size-3.5" />
            Walked today?
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" name="posted" defaultChecked={todayPosted} className="size-3.5" />
            Posted today?
          </label>
          <button type="submit" disabled={isPending} className="text-primary hover:underline">
            Save
          </button>
        </form>
      )}
    </div>
  );
}
