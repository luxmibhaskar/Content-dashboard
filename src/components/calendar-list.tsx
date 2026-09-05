import Link from "next/link";
import { ProductionStatusBar } from "@/components/production-status-bar";
import { PillarTag } from "@/components/pillar-tag";
import { GlowCard } from "@/components/glow-card";
import { pillarGlowIndex } from "@/lib/pillars";
import type { ContentCalendarItem } from "@/lib/types";

// Card layout confirmed and documented in
// docs/topic-page-redesign.md Section 0.5: title top-left (Viability
// dot retired 2026-08-27, Production Status already conveys
// workability), pillar tag in its own row below, production status as
// a centered bar in the lower-middle (replacing the old status dots).
// Items with no production_status yet are filtered out before reaching
// this list (see calendar/page.tsx), so status is always non-null here.
export function CalendarList({ items }: { items: ContentCalendarItem[] }) {
  return (
    <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        // Each card is one real, pillar-tagged piece of content, so its
        // glow should reflect that item's actual pillar, not an
        // arbitrary list-position cycle (a Mind item showing Terracotta
        // just because of where it landed in the grid). null (no pillar
        // set yet, or an unrecognized value) falls back to neutral
        // rather than guessing a color. See lib/pillars.ts.
        const glowIndex = pillarGlowIndex(item.brand, item.pillar);
        return (
          <Link key={item.id} href={`/calendar/${item.id}`}>
            <GlowCard
              glow={glowIndex ?? undefined}
              neutral={glowIndex === null}
              className="flex min-h-[132px] flex-col gap-2 p-3.5 transition hover:bg-muted/30"
            >
              <span className="truncate text-sm font-medium">
                {item.final_title || "Untitled"}
              </span>

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
                  {item.publish_date && (
                    <div className="mt-1 text-right text-[10px] text-muted-foreground">
                      {new Date(item.publish_date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  )}
                </div>
              )}
            </GlowCard>
          </Link>
        );
      })}
    </div>
  );
}
