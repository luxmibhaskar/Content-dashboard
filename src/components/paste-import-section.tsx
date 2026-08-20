"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";

type ImportState = { fallbackRaw: string | null };

// "Paste from AI chat", docs/topic-page-redesign.md Section 7. Shared
// by both Research & Copy and Scripts, each passes its own bound
// server action (importResearchCopyPaste / importScriptsPaste,
// src/app/(app)/calendar/[id]/research-copy-actions.ts and
// scripts-actions.ts). Free, pattern-based parsing happens server-side
// (src/lib/paste-import.ts), no Claude API call either way.
//
// The textarea is keyed off state.fallbackRaw rather than left as a
// bare uncontrolled field: React automatically resets uncontrolled
// fields inside an action-bound <form> once the action settles,
// success or failure alike, so a naive uncontrolled textarea loses
// exactly the raw text the fallback path is supposed to preserve. Keying
// on state.fallbackRaw forces a fresh mount with that exact text as
// defaultValue on a low-confidence parse (visibly unharmed by the
// auto-reset, since it's a new DOM node), and a fresh empty mount once
// a confident parse succeeds and fallbackRaw goes back to null. No
// effect needed either way, matches this codebase's avoidance of
// useState+useEffect synchronization (react-hooks/set-state-in-effect).
export function PasteImportSection({
  action,
  templateHint,
}: {
  action: (prevState: ImportState, formData: FormData) => Promise<ImportState>;
  templateHint: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(action, { fallbackRaw: null });

  return (
    <div className="border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        Paste from AI chat {open ? "−" : "+"}
      </button>
      {open && (
        <form action={formAction} className="mt-2 space-y-2">
          <p className="text-xs text-muted-foreground whitespace-pre-line">{templateHint}</p>
          <textarea
            key={state.fallbackRaw ?? "empty"}
            name="pasted_text"
            required
            rows={10}
            defaultValue={state.fallbackRaw ?? undefined}
            className="w-full rounded-md border border-input bg-background p-2 font-mono text-xs"
            placeholder="Paste the free AI chat's response here, matching the template above."
          />
          <div className="flex items-center gap-2">
            <Button type="submit" size="xs" variant="outline" loading={isPending}>
              Import
            </Button>
            {!isPending && state.fallbackRaw !== null && (
              <span className="text-xs text-destructive">
                Couldn&apos;t confidently match the template structure. Fix formatting and Import again,
                or copy pieces from the text above manually.
              </span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
