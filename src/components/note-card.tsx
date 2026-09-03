"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CollapsibleSection } from "@/components/collapsible-section";
import type { ContentNote } from "@/lib/types";
import { updateNote, deleteNote } from "@/app/(app)/calendar/[id]/content-notes-actions";

// One note in the topic page's Notes column. Collapsed by default via
// CollapsibleSection (same disclosure shell the phase cards use), with an
// inline view/edit toggle modelled on EditableCard (manual-workflow-ui.tsx)
// - same useState swap, same button sizes - but with its own Delete
// action and a full-height body textarea, which EditableCard's
// structured-field model doesn't carry.

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
  // See content-notes-section.tsx: the edit form's action is a client
  // closure (so it can flip `editing` off after saving), which doesn't
  // re-render the route off the server action's revalidatePath on its
  // own - refresh() re-pulls the list. Delete stays a directly-bound
  // server action, which does refresh natively (same as Reference
  // Videos' Remove).
  const router = useRouter();

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
        <form
          action={async (formData) => {
            await updateNote(contentId, note.id, formData);
            setEditing(false);
            router.refresh();
          }}
          className="space-y-2"
        >
          <Input name="title" defaultValue={note.title ?? ""} placeholder="Title (optional)" />
          <Textarea
            name="content"
            defaultValue={note.content}
            rows={6}
            placeholder="Write or paste your note..."
          />
          <div className="flex gap-2">
            <Button type="submit" size="xs">
              Save
            </Button>
            <Button type="button" size="xs" variant="ghost" onClick={() => setEditing(false)}>
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
            <Button type="button" size="xs" variant="outline" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <form action={deleteNote.bind(null, contentId, note.id)}>
              <Button type="submit" size="xs" variant="outline">
                Delete
              </Button>
            </form>
          </div>
        </div>
      )}
    </CollapsibleSection>
  );
}
