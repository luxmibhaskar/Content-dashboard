"use client";

import { useRef, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/glow-card";
import { PlatformIconPicker } from "@/components/streak-goals/platform-icon-picker";
import { addGoal } from "@/app/actions/goals";

// Streak & Goals redesign: any platform, freeform name, "add new
// platforms freely" rather than choosing from TARGET_METRIC_OPTIONS.
// current_value isn't collected here even for a custom platform, it
// starts unset and gets filled in via the Current field on the card
// itself once it exists (src/components/streak-goals/platform-goal-card.tsx),
// keeping this form to just what's needed to create the goal.
export function AddPlatformGoalForm() {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <GlowCard glow={3} className="p-4">
      <p className="text-sm font-medium">Add a platform goal</p>
      <form
        ref={formRef}
        action={(formData) =>
          startTransition(async () => {
            await addGoal(formData);
            formRef.current?.reset();
          })
        }
        className="mt-3 space-y-3"
      >
        <div className="flex items-center gap-2">
          <PlatformIconPicker name="icon_slug" />
          <Input name="platform_name" placeholder="Platform name (e.g. Instagram, Newsletter...)" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input name="target_value" type="number" placeholder="Target" />
          <Input name="target_date" type="date" />
        </div>
        <Button type="submit" size="sm" loading={isPending}>
          + Add Goal
        </Button>
      </form>
    </GlowCard>
  );
}
