"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { addDays, localDateKey, reviewWeekOf } from "@/lib/date";

// Navigates the Weekly Review page between Monday-Sunday weeks without
// hand-editing the ?week= param. Prev/Next shift by 7 days; the date
// input jumps to whichever week contains the picked day; "This week"
// clears the param back to the current default. When the week in view
// is the current default, Next is labelled "Start next week's review"
// since that is the one case where the next week has no entry yet.
export function WeekPicker({
  weekStart,
  currentWeekStart,
}: {
  weekStart: string;
  currentWeekStart: string;
}) {
  const router = useRouter();

  const goToWeekOf = (dateKey: string) => {
    router.push(`/review?week=${reviewWeekOf(dateKey).start}`);
  };
  const shiftWeeks = (weeks: number) => {
    goToWeekOf(localDateKey(addDays(new Date(`${weekStart}T00:00:00`), weeks * 7)));
  };

  const onCurrentWeek = weekStart === currentWeekStart;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => shiftWeeks(-1)}>
        &larr; Prev week
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => shiftWeeks(1)}>
        {onCurrentWeek ? "Start next week's review →" : "Next week →"}
      </Button>
      <input
        type="date"
        value={weekStart}
        onChange={(e) => e.target.value && goToWeekOf(e.target.value)}
        aria-label="Jump to the week containing this date"
        className="h-8 rounded-md border border-input bg-background px-2 py-1 text-sm"
      />
      {!onCurrentWeek && (
        <Button type="button" variant="ghost" size="sm" onClick={() => router.push("/review")}>
          Jump to current week
        </Button>
      )}
    </div>
  );
}
