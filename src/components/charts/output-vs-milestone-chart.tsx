"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { OutputVsMilestonePoint } from "@/lib/audience-growth";

// Redesign Phase 3, Graph 2's "Output vs Milestone" view: the one piece
// Tremor's chart set can't do, a true dual y-axis (content output volume
// and audience totals live on genuinely different scales, forcing them
// onto one axis would flatten whichever series is smaller). Recharts is
// already Tremor's own underlying engine (see package.json), this is the
// only chart in the app built directly on it instead of through Tremor.
export function OutputVsMilestoneChart({ data }: { data: OutputVsMilestonePoint[] }) {
  if (data.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        Not enough history yet, this view needs at least two weeks with either
        published content or a platform snapshot.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="week" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
        <YAxis
          yAxisId="output"
          allowDecimals={false}
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
        />
        <YAxis
          yAxisId="audience"
          orientation="right"
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          tickFormatter={(v: number) => v.toLocaleString()}
        />
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            color: "var(--popover-foreground)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar yAxisId="output" dataKey="Content Published" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
        <Line
          yAxisId="audience"
          type="monotone"
          dataKey="Total Audience"
          stroke="var(--chart-3)"
          strokeWidth={2}
          dot={{ r: 3 }}
          connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
