"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { createContentItemFromPaste, type CreateFromPasteState } from "@/app/(app)/calendar/actions";
import { RESEARCH_PASTE_TEMPLATE_HINT } from "@/lib/paste-import";

const initialState: CreateFromPasteState = { error: null, fallbackRaw: null };

// "+ New (Manual)": paste-first, no Title/Brief Description/Keywords
// form at all (docs/topic-page-redesign.md Section 1). The item only
// gets created once this parses confidently, createContentItemFromPaste
// (src/app/(app)/calendar/actions.ts) redirects to the new topic page
// itself on success, this component never navigates on its own. On a
// low-confidence parse, same fallback UX as the topic page's own Paste
// from AI chat: the textarea keeps the exact raw text, editable, rather
// than the form silently clearing or guessing at a wrong structure.
export function CreateFromPasteForm() {
  const [state, formAction, isPending] = useActionState(createContentItemFromPaste, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <p className="text-xs text-muted-foreground whitespace-pre-line">{RESEARCH_PASTE_TEMPLATE_HINT}</p>
      <textarea
        key={state.fallbackRaw ?? "empty"}
        name="pasted_text"
        required
        rows={16}
        autoFocus
        defaultValue={state.fallbackRaw ?? undefined}
        className="w-full rounded-md border border-input bg-background p-3 font-mono text-xs"
        placeholder="Paste the free AI chat's response here, matching the template above."
      />
      <Button type="submit" className="w-full" loading={isPending}>
        Import &amp; Create
      </Button>
      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      {!isPending && !state.error && state.fallbackRaw !== null && (
        <p className="text-sm text-destructive" role="alert">
          Couldn&apos;t confidently match the template structure. Fix formatting and try again, nothing
          was created.
        </p>
      )}
    </form>
  );
}
