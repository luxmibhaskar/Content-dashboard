import Link from "next/link";
import { ProductionStatusTracker } from "@/components/production-status-tracker";
import { ViabilityDot } from "@/components/viability-dot";
import type { ContentCalendarItem } from "@/lib/types";

export function CalendarList({ items }: { items: ContentCalendarItem[] }) {
  return (
    <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`/calendar/${item.id}`}
            className="flex items-center justify-between gap-4 px-3 py-2.5 hover:bg-muted/50"
          >
            <div className="flex min-w-0 items-center gap-2">
              <ViabilityDot status={item.viability_status} />
              <span className="truncate text-sm font-medium">
                {item.final_title || "Untitled"}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {(item.pillar || item.sub_topic) && (
                <span className="text-xs text-muted-foreground">
                  {[item.pillar, item.sub_topic].filter(Boolean).join(" / ")}
                </span>
              )}
              <ProductionStatusTracker status={item.production_status} size="sm" />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
