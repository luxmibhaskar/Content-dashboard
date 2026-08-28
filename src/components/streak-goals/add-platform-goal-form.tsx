"use client";

import { useRef, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/glow-card";
import { PlatformIconPicker } from "@/components/streak-goals/platform-icon-picker";
import { addGoal } from "@/app/actions/goals";
import { isYouTubeGoal } from "@/lib/goals";

// Streak & Goals redesign: any platform, freeform name, "add new
// platforms freely" rather than choosing from TARGET_METRIC_OPTIONS.
// Platforms consolidation: current and target side by side here too,
// setting a starting count is part of creating the goal now, not a
// separate step. A submitted current value writes a platform_snapshots
// row (src/app/actions/goals.ts), the same downstream effect the old
// Platforms modal had.
export function AddPlatformGoalForm() {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  // GROUP J: reveal the channel-id field only once the typed name looks
  // like YouTube, so it doesn't clutter every other platform's add flow.
  const [name, setName] = useState("");

  return (
    <GlowCard glow={3} className="p-4">
      <p className="text-sm font-medium">Add a platform goal</p>
      <form
        ref={formRef}
        action={(formData) =>
          startTransition(async () => {
            await addGoal(formData);
            formRef.current?.reset();
            setName("");
          })
        }
        className="mt-3 space-y-3"
      >
        <div className="flex items-center gap-2">
          <PlatformIconPicker name="icon_slug" />
          <Input
            name="platform_name"
            placeholder="Platform name (e.g. Instagram, Newsletter...)"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        {isYouTubeGoal(name) && (
          <div>
            <label className="text-xs text-muted-foreground">
              YouTube channel ID or @handle (for auto-update)
            </label>
            <Input name="source_ref" placeholder="UCxxxxxxxx or @handle" className="h-8 text-sm" />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="text-xs text-muted-foreground">Target</label>
            <Input name="target_value" type="number" placeholder="Target" className="h-8 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Current</label>
            <Input name="current_value" type="number" placeholder="Current" className="h-8 text-sm" />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground">Target date</label>
            <Input name="target_date" type="date" className="h-8 text-sm" />
          </div>
        </div>
        <Button type="submit" size="sm" loading={isPending}>
          + Add Goal
        </Button>
      </form>
    </GlowCard>
  );
}
