"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { NoteCard } from "@/components/note-card";
import type { ContentNote } from "@/lib/types";
import { createNote } from "@/app/(app)/calendar/[id]/content-notes-actions";

// docs/topic-page-redesign.md Section 11: the topic page's Notes tab,
// a 4th tab in each panel's phase row. One list per content_calendar
// row, newest first (the page query orders by updated_at desc; a fresh
// save lands at the top). Same add/list/empty-state shape as
// reference-videos-section.tsx.
export function ContentNotesSection({
  contentId,
  notes,
}: {
  contentId: string;
  notes: ContentNote[];
}) {
  // Composer is toggled, not always-inline (unlike Reference Videos): the
  // taller body textarea would otherwise sit open above the list at all
  // times.
  const [composing, setComposing] = useState(false);
  const [busy, setBusy] = useState(false);

  // Call the server action directly from the submit handler and await it,
  // the same path EditableCard uses (onClick -> onSave -> await). A
  // `<form action={closure}>` that awaits a server action does not
  // re-render the route off the action's revalidatePath when this sits
  // several client components deep (topic-page-tabs -> panel -> here), so
  // the new note never appeared without a manual reload.
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    await createNote(contentId, new FormData(e.currentTarget));
    setBusy(false);
    setComposing(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">Notes</h2>
        {!composing && (
          <Button type="button" size="xs" variant="outline" onClick={() => setComposing(true)}>
            + New note
          </Button>
        )}
      </div>

      {composing && (
        <form onSubmit={handleSubmit} className="mt-3 space-y-2 rounded-lg border border-border p-3">
          <Input name="title" placeholder="Title (optional)" />
          <Textarea name="content" rows={6} placeholder="Write or paste your note..." />
          <div className="flex gap-2">
            <Button type="submit" size="xs" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              size="xs"
              variant="ghost"
              disabled={busy}
              onClick={() => setComposing(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="mt-4 space-y-3">
        {notes.map((note) => (
          <NoteCard key={note.id} contentId={contentId} note={note} />
        ))}
        {notes.length === 0 && !composing && (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        )}
      </div>
    </div>
  );
}
