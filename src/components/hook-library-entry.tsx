"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteHookLibraryEntry,
  updateHookLibraryEntry,
} from "@/app/(app)/hook-library/actions";
import type { HookLibraryEntry } from "@/lib/types";

// Click-to-edit in place: the card's own text becomes a textarea, no
// separate edit page or modal for a one-line swipe-file entry.
export function HookLibraryEntryCard({ entry }: { entry: HookLibraryEntry }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <form
        action={async (formData) => {
          await updateHookLibraryEntry(entry.id, formData);
          setEditing(false);
        }}
        className="space-y-2 rounded-lg border border-border p-3"
      >
        <Textarea name="content" defaultValue={entry.content} rows={3} autoFocus />
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="xs" onClick={() => setEditing(false)}>
            Cancel
          </Button>
          <Button type="submit" size="xs">
            Save
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="group relative rounded-lg border border-border p-3">
      {/* break-words so a long hook with no spaces (or a pasted URL) wraps
          instead of overflowing the card and being clipped at its edge,
          whitespace-pre-wrap alone only breaks at existing spaces/newlines. */}
      <p className="pr-12 text-sm leading-relaxed whitespace-pre-wrap break-words">{entry.content}</p>
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Edit"
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Pencil className="size-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => deleteHookLibraryEntry(entry.id)}
          aria-label="Delete"
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
