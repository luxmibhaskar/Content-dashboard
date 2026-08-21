"use client";

import { useState } from "react";
import { BarChart, DonutChart } from "@tremor/react";
import { cn } from "@/lib/utils";
import type {
  AudienceDistributionPoint,
  GrowthVelocityPoint,
  OutputVsMilestonePoint,
} from "@/lib/audience-growth";
import { OutputVsMilestoneChart } from "@/components/charts/output-vs-milestone-chart";

type View = "distribution" | "velocity" | "output";

const VIEW_LABELS: Record<View, string> = {
  distribution: "Audience Distribution",
  velocity: "Growth Velocity",
  output: "Output vs Milestone",
};

const VIEW_KEYS = Object.keys(VIEW_LABELS) as View[];

// Redesign Phase 3, Graph 2: one graph, three toggleable views, not
// three separate always-visible charts, per the spec.
export function AudienceSecondaryChart({
  distribution,
  velocity,
  outputVsMilestone,
}: {
  distribution: AudienceDistributionPoint[];
  velocity: GrowthVelocityPoint[];
  outputVsMilestone: OutputVsMilestonePoint[];
}) {
  const [view, setView] = useState<View>("distribution");

  return (
    <div className="flex h-full flex-col">
      {/* Below sm, a plain flex-wrap left the 3rd button ("Output vs
          Milestone", the longest label) dangling alone on its own row,
          left-aligned with empty space beside it, reading like a layout
          accident. A 2-column grid with that button spanning both
          columns makes the wrap a deliberate full-width row instead.
          sm+ reverts to the original inline row, there's room for all
          three there already. */}
      <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {VIEW_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            className={cn(
              "rounded-md px-2.5 py-1 text-sm",
              key === "output" && "col-span-2 sm:col-span-1",
              view === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {VIEW_LABELS[key]}
          </button>
        ))}
      </div>

      <div className="mt-4 min-h-0 flex-1">
        {view === "distribution" &&
          (distribution.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No platform counts logged yet, add some from the Platforms button in the
              top bar.
            </p>
          ) : (
            <DonutChart
              className="h-full"
              data={distribution}
              category="count"
              index="platform"
              valueFormatter={(v: number) => v.toLocaleString()}
            />
          ))}

        {view === "velocity" &&
          (velocity.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Not enough platform history yet, this view needs at least two different
              weeks of logged counts.
            </p>
          ) : (
            <BarChart
              className="h-full"
              data={velocity}
              index="week"
              categories={["Net Change"]}
              colors={["blue"]}
            />
          ))}

        {view === "output" && <OutputVsMilestoneChart data={outputVsMilestone} />}
      </div>
    </div>
  );
}
