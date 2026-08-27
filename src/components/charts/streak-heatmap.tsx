import { WALK_STREAK_LABEL, type HeatmapCell } from "@/lib/streaks";
import type { Brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

const LEVEL_CLASS: Record<0 | 1 | 2, string> = {
  0: "bg-muted",
  1: "bg-primary/40",
  2: "bg-primary",
};

// Section 6.4: GitHub-style contribution heatmap from daily_streaks.
// One column per week (Sun-Sat rows), oldest week first.
export function StreakHeatmap({ brand, cells }: { brand: Brand; cells: HeatmapCell[] }) {
  if (cells.length === 0) {
    return <p className="text-sm text-muted-foreground">No streak history yet.</p>;
  }

  const streakWord = WALK_STREAK_LABEL[brand].word;
  const weeks: HeatmapCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((cell) => (
              <div
                key={cell.date}
                title={`${cell.date}: ${cell.level === 2 ? `${streakWord} + posted` : cell.level === 1 ? `${streakWord} or posted` : "neither"}`}
                className={cn("size-3 rounded-sm", LEVEL_CLASS[cell.level])}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>Neither</span>
        <div className={cn("size-3 rounded-sm", LEVEL_CLASS[0])} />
        <div className={cn("size-3 rounded-sm", LEVEL_CLASS[1])} />
        <div className={cn("size-3 rounded-sm", LEVEL_CLASS[2])} />
        <span>Both</span>
      </div>
    </div>
  );
}
