"use client";

import { useState } from "react";
import { AlertDialog } from "radix-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Danger Zone's sole control (rendered inside a collapsed-by-default
// CollapsibleSection at the bottom of the topic page, same
// out-of-default-view principle as Idea Panel's Delete idea button
// behind ?edit=1). Everything the cascade actually touches is spelled
// out in the dialog body rather than left implicit, and the typed-title
// match is extra friction on top of AlertDialog's own Cancel/confirm
// split, given how much real content (research, scripts, platform
// posts and their analytics history, workflow phases, notes, reference
// videos, benchmarks, title/hook/thumbnail variants) goes with it, per
// the ten `on delete cascade` FKs deleteContentItem relies on
// (calendar/[id]/actions.ts).
export function DeleteContentItemDialog({
  title,
  deleteAction,
}: {
  title: string;
  deleteAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const matchTarget = title.trim() || "Untitled";
  const matches = typed === matchTarget;

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setTyped("");
      }}
    >
      <AlertDialog.Trigger asChild>
        <Button type="button" variant="destructive" size="sm">
          Delete this content item
        </Button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-popover p-5 text-popover-foreground shadow-lg">
          <AlertDialog.Title className="text-lg font-semibold text-destructive">
            Delete &ldquo;{matchTarget}&rdquo;?
          </AlertDialog.Title>
          <AlertDialog.Description asChild>
            <div className="mt-2 space-y-3 text-sm text-muted-foreground">
              <p>
                This permanently deletes the item itself, not just its title or status. Everything
                attached to it goes too, and none of it can be recovered afterward:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Research &amp; copy versions and scripts</li>
                <li>Platform posts and their analytics snapshot history</li>
                <li>Manual workflow phases</li>
                <li>Notes</li>
                <li>Reference videos</li>
                <li>Competitor benchmarks</li>
                <li>Title, hook, and thumbnail variants</li>
              </ul>
              <p>
                This is not the same as archiving, it does not go to the archive, it is gone. Type the
                title below to confirm.
              </p>
            </div>
          </AlertDialog.Description>

          <div className="mt-4 space-y-1.5">
            <Label htmlFor="delete-confirm-title">
              Type <span className="font-medium text-foreground">{matchTarget}</span> to confirm
            </Label>
            <Input
              id="delete-confirm-title"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button type="button" variant="ghost" size="sm">
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <form action={deleteAction}>
              <Button type="submit" variant="destructive" size="sm" disabled={!matches}>
                Delete permanently
              </Button>
            </form>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
