"use client";

import { AreaChart } from "@tremor/react";
import type { OverTimePoint } from "@/lib/analytics";

export function PerformanceOverTimeChart({ data }: { data: OverTimePoint[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No published content with dates in this range yet.
      </p>
    );
  }

  return (
    <AreaChart
      className="h-64"
      data={data}
      index="date"
      categories={["Views", "Engagement"]}
      colors={["blue", "violet"]}
    />
  );
}
