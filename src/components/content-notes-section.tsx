"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { NoteCard } from "@/components/note-card";
import type { ContentNote } from "@/lib/types";
import { createNote } from "@/app/(app)/calendar/[id]/content-notes-actions";

// docs/topic-page-redesign.md (Notes section): the topic page's
// right-hand Notes column, sibling to the Manual/AI phase stack on the
// left. One list per content_calendar row, newest first (the page query
// orders by updated_at desc; a fresh save lands at the top). Same
// add/list/empty-state shape as reference-videos-section.tsx.
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
  // The form action is a client closure (so it can also flip `composing`
  // after the save), which means the server action's revalidatePath
  // doesn't re-render the route on its own the way a directly-passed
  // server action would - refresh() pulls the new list in.
  const router = useRouter();

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
        <form
          action={async (formData) => {
            await createNote(contentId, formData);
            setComposing(false);
            router.refresh();
          }}
          className="mt-3 space-y-2 rounded-lg border border-border p-3"
        >
          <Input name="title" placeholder="Title (optional)" />
          <Textarea name="content" rows={6} placeholder="Write or paste your note..." />
          <div className="flex gap-2">
            <Button type="submit" size="xs">
              Save
            </Button>
            <Button
              type="button"
              size="xs"
              variant="ghost"
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
