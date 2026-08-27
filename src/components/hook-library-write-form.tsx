"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { writeHookLibraryEntry } from "@/app/(app)/hook-library/actions";
import { HOOK_LIBRARY_TYPES, type HookLibraryType } from "@/lib/types";

// "Write a hook" (2026-08-27): a manual-entry alternative to
// HookLibraryImport's file upload, one hook at a time, saving directly,
// no CSV/JSON round trip needed for a single entry. Same type-first,
// content-second layout as Import, so the two forms read as a pair.
export function HookLibraryWriteForm() {
  const [type, setType] = useState<HookLibraryType>("visual");

  return (
    <form action={writeHookLibraryEntry} className="flex flex-wrap items-center gap-2">
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
      <Input name="content" required placeholder="Write a hook..." className="min-w-48 flex-1" />
      <Button type="submit" size="sm" variant="outline">
        Write a hook
      </Button>
    </form>
  );
}
