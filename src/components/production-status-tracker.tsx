import { cn } from "@/lib/utils";
import { PRODUCTION_STATUSES, type ProductionStatus } from "@/lib/types";

export function ProductionStatusTracker({
  status,
  size = "default",
}: {
  status: ProductionStatus;
  size?: "sm" | "default";
}) {
  const currentIndex = PRODUCTION_STATUSES.indexOf(status);

  return (
    <div className="flex items-center gap-1">
      {PRODUCTION_STATUSES.map((step, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div
            key={step}
            title={step}
            className={cn(
              "rounded-full",
              size === "sm" ? "size-1.5" : "size-2.5",
              isDone && "bg-primary",
              isCurrent && "bg-primary/40 ring-1 ring-primary",
              !isDone && !isCurrent && "bg-muted",
            )}
          />
        );
      })}
      {size === "default" && (
        <span className="ml-1 text-xs text-muted-foreground">{status}</span>
      )}
    </div>
  );
}
