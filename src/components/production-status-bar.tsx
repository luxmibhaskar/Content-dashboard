import { PRODUCTION_STATUSES, type ProductionStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

// Section 19 Calendar card redesign: replaces the old status-dots
// tracker on cards specifically. A centered, ~80%-width bar/label,
// intensity increases with pipeline stage so "Published / Scheduled"
// reads as visibly done at a glance, not just as text.
const STAGE_STYLES: Record<ProductionStatus, string> = {
  "Ready to Record / Scripted": "bg-muted text-muted-foreground",
  Recorded: "bg-primary/15 text-foreground",
  Editing: "bg-primary/35 text-foreground",
  "Published / Scheduled": "bg-primary text-primary-foreground",
};

export function ProductionStatusBar({ status }: { status: ProductionStatus }) {
  const stageIndex = PRODUCTION_STATUSES.indexOf(status);
  return (
    <div
      title={status}
      className={cn(
        "mx-auto w-4/5 truncate rounded-md px-2 py-1 text-center text-xs font-medium",
        STAGE_STYLES[status],
      )}
    >
      {status}
      <span className="ml-1 text-[10px] opacity-70">
        {stageIndex + 1}/{PRODUCTION_STATUSES.length}
      </span>
    </div>
  );
}
