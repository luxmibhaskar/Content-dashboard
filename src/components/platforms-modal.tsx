"use client";

import { useState } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLATFORMS } from "@/lib/platforms";

// Phase 1 of the Command Center redesign: the entry form only. Saving
// isn't wired to storage yet, that lands with Phase 2's platform_snapshots
// table, no fake Save button pretending to persist something it can't yet.
export function PlatformsModal() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="text-sm text-muted-foreground outline-none hover:text-foreground"
        >
          Platforms
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-popover p-5 text-popover-foreground shadow-lg">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">Platform Counts</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" aria-label="Close" className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            Manually enter each platform&apos;s current follower/subscriber count.
            Not wired to storage yet, this is the entry form only, saving lands
            once the Platforms data model is in place.
          </Dialog.Description>

          <div className="mt-4 space-y-3">
            {PLATFORMS.map((platform) => (
              <div key={platform} className="flex items-center justify-between gap-3">
                <label htmlFor={`platform-${platform}`} className="text-sm">
                  {platform}
                </label>
                <input
                  id={`platform-${platform}`}
                  type="number"
                  min={0}
                  placeholder="0"
                  disabled
                  className="h-8 w-32 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-50"
                />
              </div>
            ))}
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button type="button" variant="outline" size="sm">
                Close
              </Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
