"use client";

import { BarChart } from "@tremor/react";
import type { DayOfWeekPoint } from "@/lib/analytics";

export function BestTimeToPostChart({ data }: { data: DayOfWeekPoint[] }) {
  if (data.every((d) => d["Avg Views"] === 0)) {
    return <p className="text-sm text-muted-foreground">Not enough published volume yet to see a pattern.</p>;
  }

  return <BarChart className="h-56" data={data} index="day" categories={["Avg Views"]} colors={["blue"]} />;
}
