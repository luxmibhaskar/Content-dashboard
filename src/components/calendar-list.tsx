import Link from "next/link";
import { ProductionStatusBar } from "@/components/production-status-bar";
import { ViabilityDot } from "@/components/viability-dot";
import { PillarTag } from "@/components/pillar-tag";
import type { ContentCalendarItem } from "@/lib/types";

// Section 19 Calendar card redesign: title top, pillar-colored tag,
// production status as a centered bar in the lower-middle (replacing the
// old status dots), viability dot kept alongside as a separate concern
// (is this workable right now vs. where in the pipeline). Items with no
// production_status yet are filtered out before reaching this list (see
// calendar/page.tsx), so status is always non-null here.
export function CalendarList({ items }: { items: ContentCalendarItem[] }) {
  return (
    <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/calendar/${item.id}`}
          className="flex min-h-[132px] flex-col gap-2 rounded-lg border border-border p-3.5 transition hover:border-primary/40 hover:shadow-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="truncate text-sm font-medium">
              {item.final_title || "Untitled"}
            </span>
            <ViabilityDot status={item.viability_status} />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {item.pillar && <PillarTag pillar={item.pillar} />}
            {item.sub_topic && (
              <span className="truncate text-xs text-muted-foreground">{item.sub_topic}</span>
            )}
            {item.is_archived && (
              <span
                className="shrink-0 rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground"
                title="Archived: full detail lives in Drive, opening it retrieves it back automatically"
              >
                Archived
              </span>
            )}
          </div>

          {item.production_status && (
            <div className="mt-auto pt-2">
              <ProductionStatusBar status={item.production_status} />
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
