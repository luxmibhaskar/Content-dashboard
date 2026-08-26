"use client";

import { BarChart } from "@tremor/react";
import type { DayOfWeekPoint } from "@/lib/analytics";

// docs/platform-performance-tracking.md Section 8: renamed from "Best
// Time to Post", same bar-per-day shape, just sourced from real
// per-platform-post data now (see computeContentPostedTime,
// src/lib/analytics.ts) instead of approximating from publish_date.
export function ContentPostedTimeChart({ data }: { data: DayOfWeekPoint[] }) {
  if (data.every((d) => d["Avg Views"] === 0)) {
    return <p className="text-sm text-muted-foreground">Not enough posted volume yet to see a pattern.</p>;
  }

  return <BarChart className="h-56" data={data} index="day" categories={["Avg Views"]} colors={["blue"]} />;
}
