"use client";

import { DonutChart } from "@tremor/react";

export function PillarBalanceChart({ data }: { data: { pillar: string; count: number }[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing posted in this range yet.</p>;
  }

  return <DonutChart className="h-56" data={data} category="count" index="pillar" />;
}
