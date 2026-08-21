"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { importHookLibrary, type ImportState } from "@/app/(app)/hook-library/actions";
import { HOOK_LIBRARY_TYPES, type HookLibraryType } from "@/lib/types";

const initialState: ImportState = { error: null, imported: null, skipped: 0 };

// One type, chosen here first, applies to every entry in the uploaded
// file, no per-row type field, no auto-routing, no AI classification.
// Unlabeled raw text pasted in expecting the app to figure out the type
// by reading it would need an actual model call, a different, non-free
// feature, not this one.
export function HookLibraryImport() {
  const [state, action, isPending] = useActionState(importHookLibrary, initialState);
  const [type, setType] = useState<HookLibraryType>("visual");
  const formRef = useRef<HTMLFormElement>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!isPending && submittedRef.current && !state.error) {
      formRef.current?.reset();
      submittedRef.current = false;
    }
  }, [isPending, state]);

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={() => {
        submittedRef.current = true;
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <select
        name="type"
        value={type}
        onChange={(e) => setType(e.target.value as HookLibraryType)}
        className="h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm capitalize"
      >
        {HOOK_LIBRARY_TYPES.map((t) => (
          <option key={t} value={t} className="capitalize">
            {t}
          </option>
        ))}
      </select>
      <input
        type="file"
        name="file"
        accept=".csv,.json,text/csv,application/json"
        required
        className="text-sm text-muted-foreground file:mr-2 file:rounded-md file:border file:border-input file:bg-background file:px-2 file:py-1 file:text-sm file:text-foreground"
      />
      <Button type="submit" size="sm" variant="outline" loading={isPending}>
        Import
      </Button>
      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      {state.imported !== null && (
        <p className="text-sm text-muted-foreground">
          Imported {state.imported}
          {state.skipped > 0 ? `, skipped ${state.skipped} (blank entries)` : ""}.
        </p>
      )}
    </form>
  );
}
