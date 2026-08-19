"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { quickCaptureToJourneyLog, type QuickEntryState } from "@/app/(app)/journey/actions";

const initialState: QuickEntryState = { error: null };

// docs/topic-page-redesign.md Section 4: whatever gets typed and saved
// here goes straight into Journey Log, no destination picker, no
// migration step. Stays on Today after saving (no redirect to Journey
// Log), that's what makes this "quick capture" rather than "go finish
// this entry elsewhere."
export function TodayQuickEntry() {
  const [state, action, isPending] = useActionState(quickCaptureToJourneyLog, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!isPending && submittedRef.current && !state.error) {
      formRef.current?.reset();
      submittedRef.current = false;
    }
  }, [isPending, state]);

  return (
    <div className="mx-auto mt-6 w-full max-w-lg">
      <form
        ref={formRef}
        action={action}
        onSubmit={() => {
          submittedRef.current = true;
        }}
        className="space-y-2 rounded-lg border border-border p-4"
      >
        <Textarea
          name="entry"
          placeholder="What happened today, worth remembering?"
          rows={3}
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
      </form>
    </div>
  );
}
