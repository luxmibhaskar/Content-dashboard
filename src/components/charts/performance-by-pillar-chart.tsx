"use client";

import { BarChart } from "@tremor/react";
import type { PillarPoint } from "@/lib/analytics";

export function PerformanceByPillarChart({ data }: { data: PillarPoint[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No pillar data in this range yet.</p>;
  }

  return (
    <BarChart
      className="h-64"
      data={data}
      index="pillar"
      categories={["Views", "Engagement"]}
      colors={["blue", "violet"]}
    />
  );
}
