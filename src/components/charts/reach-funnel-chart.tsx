"use client";

import { FunnelChart } from "@tremor/react";

export function ReachFunnelChart({ data }: { data: { name: string; value: number }[] }) {
  if (data.every((d) => d.value === 0)) {
    return <p className="text-sm text-muted-foreground">No metrics tracked in this range yet.</p>;
  }

  return <FunnelChart className="h-64" data={data} showYAxis />;
}
