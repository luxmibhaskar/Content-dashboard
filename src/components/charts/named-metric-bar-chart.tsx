"use client";

import { BarChart } from "@tremor/react";
import type { NamedMetric } from "@/lib/analytics";

export function NamedMetricBarChart({
  data,
  emptyLabel,
}: {
  data: NamedMetric[];
  emptyLabel: string;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <BarChart
      className="h-64"
      data={data}
      index="name"
      categories={["Views", "Engagement"]}
      colors={["blue", "violet"]}
    />
  );
}
