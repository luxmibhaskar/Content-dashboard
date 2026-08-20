"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GlowCard } from "@/components/glow-card";
import { quickCaptureToJourneyLog, type QuickEntryState } from "@/app/(app)/journey/actions";

const initialState: QuickEntryState = { error: null };

// docs/topic-page-redesign.md Section 4: whatever gets typed and saved
// here goes straight into Journey Log, no destination picker, no
// migration step. Stays on Dashboard after saving (no redirect to
// Journey Log), that's what makes this "quick capture" rather than "go
// finish this entry elsewhere."
//
// Layout follow-up: lives inside the Journey Log sidebar card now
// (embedded=true, src/components/journey-log-widget.tsx), not as its
// own standalone block in the main column. embedded drops the
// centering/max-width wrapper and the GlowCard (the sidebar card is
// already one, nesting a second would glow-in-glow) since the parent
// card already provides both.
export function TodayQuickEntry({ embedded = false }: { embedded?: boolean }) {
  const [state, action, isPending] = useActionState(quickCaptureToJourneyLog, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!isPending && submittedRef.current && !state.error) {
      formRef.current?.reset();
      submittedRef.current = false;
    }
  }, [isPending, state]);

  const fields = (
    <>
      <Textarea
        name="entry"
        placeholder="What happened today, worth remembering?"
        rows={embedded ? 2 : 3}
        className="resize-none"
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Saves straight to My Journey Log.</p>
        <Button type="submit" size="sm" loading={isPending}>
          Save
        </Button>
      </div>
      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
    </>
  );

  const form = (
    <form
      ref={formRef}
      action={action}
      onSubmit={() => {
        submittedRef.current = true;
      }}
      className={embedded ? "space-y-2" : undefined}
    >
      {embedded ? fields : <GlowCard glow={1} className="space-y-2 p-4">{fields}</GlowCard>}
    </form>
  );

  if (embedded) return form;

  return <div className="mx-auto mt-6 w-full max-w-lg">{form}</div>;
}
