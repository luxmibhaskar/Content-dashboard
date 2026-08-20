"use client";

import { useState, useTransition } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLATFORMS, type Platform } from "@/lib/platforms";
import { savePlatformCounts } from "@/app/actions/platforms";

// Redesign Phase 2 of the Command Center redesign: wired to
// platform_snapshots (supabase/migrations/0012_platform_snapshots.sql).
// initialCounts is each platform's latest saved snapshot (fetched in
// the (app) layout), pre-filling the form instead of opening blank.
export function PlatformsModal({ initialCounts }: { initialCounts: Partial<Record<Platform, number>> }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

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
            Saved as today&apos;s snapshot, re-saving later today updates it rather
            than adding a duplicate.
          </Dialog.Description>

          <form
            action={(formData) => {
              startTransition(async () => {
                await savePlatformCounts(formData);
                setOpen(false);
              });
            }}
          >
            <div className="mt-4 space-y-3">
              {PLATFORMS.map((platform) => (
                <div key={platform} className="flex items-center justify-between gap-3">
                  <label htmlFor={`platform-${platform}`} className="text-sm">
                    {platform}
                  </label>
                  <input
                    id={`platform-${platform}`}
                    name={`platform-${platform}`}
                    type="number"
                    min={0}
                    placeholder="0"
                    defaultValue={initialCounts[platform] ?? ""}
                    className="h-8 w-32 rounded-md border border-input bg-background px-2 text-sm"
                  />
                </div>
              ))}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button type="button" variant="outline" size="sm">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
