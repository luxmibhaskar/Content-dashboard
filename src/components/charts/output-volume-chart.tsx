"use client";

import { BarChart } from "@tremor/react";
import type { VolumePoint } from "@/lib/analytics";

export function OutputVolumeChart({ data, pillars }: { data: VolumePoint[]; pillars: string[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing posted in this range yet.</p>;
  }

  return (
    <BarChart className="h-64" data={data} index="period" categories={pillars} stack />
  );
}
