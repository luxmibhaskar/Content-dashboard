"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { archiveCustomSubTopic } from "@/app/(app)/topic-map/actions";

// Custom sub-topics only (never the locked PILLAR_STRUCTURE ones, see
// topic-map/page.tsx). Real friction before removing, per
// docs/topic-page-redesign.md: clicking the × doesn't remove anything by
// itself, it opens an inline confirm step showing how many existing
// items already carry this tag, removal only happens on a second,
// explicit click. Archiving (not deleting) is what actually runs, see
// archiveCustomSubTopic, so those already-tagged items keep the tag
// exactly as-is either way.
export function RemovableSubTopicPill({
  id,
  sub,
  color,
  usageCount,
}: {
  id: string;
  sub: string;
  color: string;
  usageCount: number;
}) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const boundArchive = archiveCustomSubTopic.bind(null, id);

  return (
    <div className="relative flex items-center">
      <span
        className="absolute top-1/2 -left-8 hidden h-px w-8 -translate-y-1/2 sm:block"
        style={{ backgroundColor: `${color}66` }}
        aria-hidden="true"
      />
      <div
        className="flex items-center gap-1.5 rounded-lg border py-1.5 pr-1.5 pl-3 text-xs font-medium"
        style={{ borderColor: `${color}66`, backgroundColor: `${color}14`, color }}
      >
        <span className="rounded bg-white px-1.5 py-px" style={{ color }}>
          {sub}
        </span>
        {!confirming && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label={`Remove custom sub-topic ${sub}`}
            className="rounded p-0.5 text-current opacity-60 hover:opacity-100 hover:bg-black/10"
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      {confirming && (
        <div
          role="dialog"
          aria-label={`Confirm removing ${sub}`}
          className="absolute top-full left-0 z-10 mt-1 w-56 rounded-md border border-border bg-popover p-3 text-xs text-popover-foreground shadow-md"
        >
          <p>
            Remove <span className="font-medium">{sub}</span>?
          </p>
          <p className="mt-1 text-muted-foreground">
            {usageCount > 0
              ? `Used by ${usageCount} existing item${usageCount === 1 ? "" : "s"}. They'll keep this tag as-is.`
              : "Not used by anything yet."}{" "}
            It won&apos;t be offered for new tagging anymore.
          </p>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" size="xs" variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="xs"
              variant="destructive"
              loading={isPending}
              onClick={() => startTransition(() => boundArchive())}
            >
              Remove
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
