import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/glow-card";
import { PLATFORMS, type CompetitorBenchmark } from "@/lib/types";
import {
  addCompetitorBenchmark,
  deleteCompetitorBenchmark,
} from "@/app/(app)/calendar/[id]/benchmark-actions";

export function CompetitorBenchmarksSection({
  contentId,
  benchmarks,
  competitors,
}: {
  contentId: string;
  benchmarks: CompetitorBenchmark[];
  competitors: { id: string; name: string }[];
}) {
  return (
    <GlowCard glow={3} className="p-4" textHeavy>
      <p className="text-sm font-medium">Competitor Benchmarks</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Per-topic competitor references. The high-level map across all topics lives on the
        Competitors tab.
      </p>

      <div className="mt-3 space-y-2">
        {benchmarks.length === 0 && (
          <p className="text-sm text-muted-foreground">No benchmarks added yet.</p>
        )}
        {benchmarks.map((b) => (
          <div
            key={b.id}
            className="flex items-start justify-between gap-3 rounded-md border border-border p-2.5"
          >
            <div className="min-w-0 text-sm">
              <span className="font-medium">{b.competitor_name || "Untitled"}</span>
              {b.platform && <span className="text-muted-foreground"> &middot; {b.platform}</span>}
              {b.why_benchmark && (
                <p className="text-xs text-muted-foreground">{b.why_benchmark}</p>
              )}
              {b.url && (
                <a
                  href={b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:underline"
                >
                  {b.url}
                </a>
              )}
            </div>
            <form action={deleteCompetitorBenchmark.bind(null, contentId, b.id)}>
              <Button
                type="submit"
                size="xs"
                variant="ghost"
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                Remove
              </Button>
            </form>
          </div>
        ))}
      </div>

      <form
        action={addCompetitorBenchmark.bind(null, contentId)}
        className="mt-3 space-y-2 border-t border-border pt-3"
      >
        <div className="grid grid-cols-2 gap-2">
          <select
            name="competitor_id"
            defaultValue=""
            className="h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
          >
            <option value="">Type a new name instead...</option>
            {competitors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Input name="competitor_name" placeholder="Or type a competitor name" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            name="platform"
            list="benchmark-platform-options"
            placeholder="Platform"
            className="h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
          />
          <datalist id="benchmark-platform-options">
            {PLATFORMS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          <Input name="url" placeholder="URL" />
        </div>
        <Input name="why_benchmark" placeholder="Why benchmark, e.g. better hook, stronger CTA" />
        <Input name="notes" placeholder="Notes (optional)" />
        <Button type="submit" size="sm" variant="outline">
          Add benchmark
        </Button>
      </form>
    </GlowCard>
  );
}
