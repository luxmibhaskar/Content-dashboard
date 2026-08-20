"use client";

import { DonutChart } from "@tremor/react";
import type { OutputCounts, FormatBreakdown } from "@/lib/content-output";

export function ContentOutputTracker({
  counts,
  breakdown,
}: {
  counts: OutputCounts;
  breakdown: FormatBreakdown;
}) {
  const chartData = [
    { format: "Long-Format", count: breakdown.long },
    { format: "Short-Format", count: breakdown.short },
    ...(breakdown.other > 0 ? [{ format: "Other", count: breakdown.other }] : []),
  ].filter((d) => d.count > 0);

  return (
    <div className="flex h-full flex-col">
      <p className="text-sm font-medium">Content Output Tracker</p>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xl font-semibold">{counts.last30Days}</p>
          <p className="text-xs text-muted-foreground">Last 30 Days</p>
        </div>
        <div>
          <p className="text-xl font-semibold">{counts.thisMonth}</p>
          <p className="text-xs text-muted-foreground">This Month</p>
        </div>
        <div>
          <p className="text-xl font-semibold">{counts.thisWeek}</p>
          <p className="text-xs text-muted-foreground">This Week</p>
        </div>
      </div>

      <div className="mt-4 flex-1">
        <p className="text-xs text-muted-foreground">Format breakdown, last 30 days</p>
        {chartData.length === 0 ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Nothing published in the last 30 days yet.
          </p>
        ) : (
          <DonutChart className="mt-2 h-36" data={chartData} category="count" index="format" />
        )}
      </div>
    </div>
  );
}
