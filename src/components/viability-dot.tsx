import { cn } from "@/lib/utils";
import type { ViabilityStatus } from "@/lib/types";

const COLOR_BY_STATUS: Record<ViabilityStatus, string> = {
  Ready: "bg-emerald-500",
  "Waiting for Evidence": "bg-amber-500",
  "Needs More Time": "bg-amber-500",
  "On Hold": "bg-zinc-400",
};

export function ViabilityDot({ status }: { status: ViabilityStatus }) {
  return (
    <span
      title={status}
      className={cn("inline-block size-2 rounded-full", COLOR_BY_STATUS[status])}
    />
  );
}
