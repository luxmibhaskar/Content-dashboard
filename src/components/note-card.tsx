"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CollapsibleSection } from "@/components/collapsible-section";
import type { ContentNote } from "@/lib/types";
import { updateNote, deleteNote } from "@/app/(app)/calendar/[id]/content-notes-actions";

// One note in the topic page's Notes tab. Collapsed by default via
// CollapsibleSection (same disclosure shell the phase cards use), with an
// inline view/edit toggle modelled on EditableCard (manual-workflow-ui.tsx)
// - same useState swap, same button sizes - but with its own Delete
// action and a full-height body textarea, which EditableCard's
// structured-field model doesn't carry.
//
// Save and Delete call the server action directly from an event handler
// and `await` it, exactly like EditableCard's onClick->onSave->await
// path, rather than through a `<form action={...}>`. A form-action
// closure that awaits a server action does NOT re-render the route off
// the action's revalidatePath when this card sits several client
// components deep (topic-page-tabs -> manual/ai panel -> here), so the
// updated list never showed without a manual reload; the direct-await
// path revalidates the same way EditableCard's edits already do.

// Collapsed summary line: the title, else the first non-empty line of the
// body (truncated), else a fixed fallback.
function summaryLabel(note: ContentNote): string {
  const title = note.title?.trim();
  if (title) return title;
  const firstLine = note.content
    .split("\n")
    .map((s) => s.trim())
    .find(Boolean);
  if (!firstLine) return "Untitled note";
  return firstLine.length > 60 ? `${firstLine.slice(0, 57).trimEnd()}…` : firstLine;
}

export function NoteCard({ contentId, note }: { contentId: string; note: ContentNote }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    await updateNote(contentId, note.id, new FormData(e.currentTarget));
    setBusy(false);
    setEditing(false);
  }

  async function handleDelete() {
    setBusy(true);
    await deleteNote(contentId, note.id);
    // No setBusy(false): the card is gone from the revalidated list.
  }

  return (
    <CollapsibleSection
      title={summaryLabel(note)}
      titleSuffix={
        <span className="text-[10px] font-normal text-muted-foreground">
          {new Date(note.updated_at).toLocaleDateString()}
        </span>
      }
      glow={3}
      neutral
    >
      {editing ? (
        <form onSubmit={handleEditSubmit} className="space-y-2">
          <Input name="title" defaultValue={note.title ?? ""} placeholder="Title (optional)" />
          <Textarea
            name="content"
            defaultValue={note.content}
            rows={6}
            placeholder="Write or paste your note..."
          />
          <div className="flex gap-2">
            <Button type="submit" size="xs" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              size="xs"
              variant="ghost"
              disabled={busy}
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          {note.content.trim() ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{note.content}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">No content.</p>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              size="xs"
              variant="outline"
              disabled={busy}
              onClick={() => setEditing(true)}
            >
              Edit
            </Button>
            <Button
              type="button"
              size="xs"
              variant="outline"
              disabled={busy}
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </div>
      )}
    </CollapsibleSection>
  );
}
