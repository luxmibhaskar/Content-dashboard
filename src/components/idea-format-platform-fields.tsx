"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CONTENT_FORMAT_OPTIONS } from "@/lib/types";

const SELECT_CLASSNAME = "h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm";

// Idea Panel's own Format field (2026-08-27), brought up to the same
// pattern Content Calendar's topic page already uses
// (format-platform-fields.tsx): narrowed to Long/Short (CONTENT_FORMAT_OPTIONS,
// shared from there rather than a second hardcoded list) instead of the
// legacy 7-value FORMATS, plus a "posted on" platform picker. One client
// component since the picker's visibility depends on Format's own live
// value. knownPlatforms is exactly goals.platform_name for this idea's
// brand, no static fallback, same source of truth Content Calendar's own
// picker uses - add or delete a platform goal in Streak & Goals and both
// pickers reflect it on next load. Only used on the full edit page
// (ideas/[id]/page.tsx); the quick-add form on ideas/page.tsx keeps
// Format narrowed too but skips the picker, to stay fast to fill in.
export function IdeaFormatPlatformFields({
  initialFormat,
  initialPlatforms,
  knownPlatforms,
}: {
  initialFormat: string;
  initialPlatforms: string[];
  knownPlatforms: string[];
}) {
  const [format, setFormat] = useState(initialFormat);
  const [platforms, setPlatforms] = useState<string[]>(initialPlatforms);

  function togglePlatform(p: string) {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  // Same case-insensitive dedupe as format-platform-fields.tsx's own
  // platformOptions, same reasoning: goals aren't constrained to one
  // casing per platform, and an already-saved value shouldn't vanish
  // from its own picker just because its goal was since deleted.
  const seenPlatformKeys = new Set<string>();
  const platformOptions: string[] = [];
  for (const p of [...knownPlatforms, ...initialPlatforms]) {
    const key = p.trim().toLowerCase();
    if (!key || seenPlatformKeys.has(key)) continue;
    seenPlatformKeys.add(key);
    platformOptions.push(p);
  }

  return (
    <>
      <div className="space-y-2.5">
        <Label htmlFor="format">Format</Label>
        <select
          id="format"
          name="format"
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          className={SELECT_CLASSNAME}
        >
          <option value="">-</option>
          {CONTENT_FORMAT_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {(format === "Short" || format === "Long Video") && (
        <div className="space-y-2.5">
          <Label>Posted on (select all that apply)</Label>
          {platformOptions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {platformOptions.map((p) => {
                const selected = platforms.includes(p);
                return (
                  <Button
                    key={p}
                    type="button"
                    size="xs"
                    variant={selected ? "default" : "outline"}
                    aria-pressed={selected}
                    onClick={() => togglePlatform(p)}
                  >
                    {p}
                  </Button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No platforms in Streak &amp; Goals yet, add one there first.
            </p>
          )}
          {platforms.map((p) => (
            <input key={p} type="hidden" name="platform" value={p} />
          ))}
        </div>
      )}
    </>
  );
}
