"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { MainPoint } from "@/lib/types";

export function MainPointersEditor({
  name,
  initialPoints,
}: {
  name: string;
  initialPoints: MainPoint[];
}) {
  const [points, setPoints] = useState<MainPoint[]>(initialPoints);

  function addPoint() {
    setPoints((prev) => [
      ...prev,
      { point_text: "", landing_line: "", runtime_estimate_seconds: null },
    ]);
  }

  function updatePoint(index: number, patch: Partial<MainPoint>) {
    setPoints((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function removePoint(index: number) {
    setPoints((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(points)} />
      {points.map((point, index) => (
        <div key={index} className="space-y-2 rounded-md border border-border p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Point {index + 1}
            </span>
            <button
              type="button"
              onClick={() => removePoint(index)}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              Remove
            </button>
          </div>
          <Input
            placeholder="The essential thing to say"
            value={point.point_text}
            onChange={(e) => updatePoint(index, { point_text: e.target.value })}
          />
          <div className="flex gap-2">
            <Input
              placeholder="Landing line (optional)"
              value={point.landing_line ?? ""}
              onChange={(e) => updatePoint(index, { landing_line: e.target.value })}
            />
            <Input
              type="number"
              min={0}
              placeholder="sec"
              className="w-20 shrink-0"
              value={point.runtime_estimate_seconds ?? ""}
              onChange={(e) =>
                updatePoint(index, {
                  runtime_estimate_seconds: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </div>
        </div>
      ))}
      {points.length === 0 && (
        <p className="text-sm text-muted-foreground">No points yet.</p>
      )}
      <Button type="button" variant="outline" size="sm" onClick={addPoint}>
        Add point
      </Button>
    </div>
  );
}
