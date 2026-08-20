import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TodayQuickEntry } from "@/components/today-quick-entry";
import { createJourneyEntry } from "@/app/(app)/journey/actions";
import type { JourneyEntry } from "@/lib/types";

// Command Center redesign: a condensed, recent-entries view of the full
// filterable /journey page, moved into Dashboard's sidebar. The full
// page (filters, complete history) stays intact and reachable via
// "View all".
// Layout follow-up: the actual quick-entry writing box (previously its
// own block in the main column) now lives here too, "+New" stays as the
// separate blank-entry-then-edit-full-fields flow, a different action
// from a fast one-line capture.
export function JourneyLogWidget({ entries }: { entries: JourneyEntry[] }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Journey Log</p>
        <form action={createJourneyEntry}>
          <Button type="submit" size="xs" variant="outline">
            + New
          </Button>
        </form>
      </div>

      <div className="mt-3">
        <TodayQuickEntry embedded />
      </div>

      <ul className="mt-3 flex-1 space-y-1 overflow-y-auto">
        {entries.map((entry) => (
          <li key={entry.id}>
            <Link
              href={`/journey/${entry.id}`}
              className="block rounded-md px-2 py-1.5 hover:bg-muted/50"
            >
              <span className="text-xs text-muted-foreground">{entry.entry_date}</span>
              <p className="truncate text-sm">
                {entry.key_lesson_insight || entry.what_i_did_experienced || "No lesson recorded yet"}
              </p>
            </Link>
          </li>
        ))}
        {entries.length === 0 && (
          <li className="px-2 py-1.5 text-sm text-muted-foreground">
            No entries yet. Add your first one above.
          </li>
        )}
      </ul>

      <Link href="/journey" className="mt-2 text-xs text-muted-foreground hover:underline">
        View all &rarr;
      </Link>
    </div>
  );
}
