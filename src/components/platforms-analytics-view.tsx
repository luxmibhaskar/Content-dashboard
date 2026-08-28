import { PlatformGoalCard } from "@/components/streak-goals/platform-goal-card";
import { AddPlatformGoalForm } from "@/components/streak-goals/add-platform-goal-form";
import type { Goal } from "@/lib/types";

// GROUP J: the Analytics page's "Platforms" view. Same platform list and
// same edit/add interaction as Streak and Goals' Goals tab, reading the
// same goals + platform_snapshots data (resolved by the page via
// resolveGoalCurrentValues, exactly as the top bar does), not a copy.
// Unlike the top-bar shuffle it ignores lib/shuffle-visibility entirely:
// this is a full page, so every tracked platform always shows here
// regardless of that per-widget toggle.
export function PlatformsAnalyticsView({ goals }: { goals: Goal[] }) {
  return (
    <div className="mt-6 space-y-3">
      <p className="text-sm text-muted-foreground">
        Every platform tracked in Streak and Goals. Editing a platform here and editing it
        there are the same data, a change in one shows in the other.
      </p>
      {goals.map((g) => (
        <PlatformGoalCard key={g.id} goal={g} />
      ))}
      {goals.length === 0 && (
        <p className="text-sm text-muted-foreground">No platform goals yet. Add your first one below.</p>
      )}
      <AddPlatformGoalForm />
    </div>
  );
}
