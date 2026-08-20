"use client";

import { AreaChart } from "@tremor/react";
import type { AudienceGrowthPoint } from "@/lib/audience-growth";

// Redesign Phase 3, Graph 1. A single snapshot can't show a trend, flag
// that plainly instead of rendering a chart with one dot on it.
export function AudienceGrowthChart({ data }: { data: AudienceGrowthPoint[] }) {
  if (data.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        Not enough platform history yet, log counts in Platforms on at least two
        different days to see a trend here.
      </p>
    );
  }

  return (
    <AreaChart
      className="h-64"
      data={data}
      index="date"
      categories={["Total Audience"]}
      colors={["blue"]}
      valueFormatter={(v: number) => v.toLocaleString()}
    />
  );
}
