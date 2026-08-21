"use client";

import { useState } from "react";
import { HOOK_LIBRARY_TYPES, type HookLibraryType } from "@/lib/types";

type ExportSelection = HookLibraryType | "all";

// One type per export by default, matching the one-type-per-import flow,
// plus an "All" choice that exports all three types combined (with a
// type column/field) for when the whole swipe file is wanted at once.
// The selection picked here is what the CSV/JSON links below actually
// download, real <a href> links to the export route (not a client-side
// blob), so the browser handles the download natively once clicked.
export function HookLibraryExport() {
  const [selection, setSelection] = useState<ExportSelection>("all");

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span>Export:</span>
      <select
        value={selection}
        onChange={(e) => setSelection(e.target.value as ExportSelection)}
        className="h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm capitalize"
      >
        <option value="all">All</option>
        {HOOK_LIBRARY_TYPES.map((t) => (
          <option key={t} value={t} className="capitalize">
            {t}
          </option>
        ))}
      </select>
      <a
        href={`/api/hook-library/export?format=csv&type=${selection}`}
        className="hover:text-foreground hover:underline"
      >
        CSV
      </a>
      <a
        href={`/api/hook-library/export?format=json&type=${selection}`}
        className="hover:text-foreground hover:underline"
      >
        JSON
      </a>
    </div>
  );
}
