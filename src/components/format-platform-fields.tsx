"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CONTENT_POST_PLATFORMS } from "@/lib/types";

const SELECT_CLASSNAME = "h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm";

const CONTENT_FORMAT_OPTIONS: { value: string; label: string }[] = [
  { value: "Short", label: "Short" },
  { value: "Long Video", label: "Long" },
];

// Format + Publish date + (Short only) the "posted on" platform
// multiselect, one client component since the multiselect's visibility
// depends on Format's own live value, plain server-rendered selects
// can't react to each other. No nested <form>: like
// pillar-sub-topic-selects.tsx, this renders directly inside the
// topic page's own outer <form>, its inputs (format, publish_date,
// platform x N) submit as part of that same Save.
export function FormatPlatformFields({
  initialFormat,
  initialPlatforms,
  publishDateValue,
}: {
  initialFormat: string;
  initialPlatforms: string[];
  publishDateValue: string;
}) {
  const [format, setFormat] = useState(initialFormat);
  // Kept independent of Format's own value (not reset when Format
  // changes away from Short) so switching to Long and back before
  // saving doesn't lose what was already picked. Actually saving while
  // Format isn't Short does clear it though, on purpose: the hidden
  // inputs below only render while this section is visible, so nothing
  // named "platform" reaches formData.getAll in that case, and an item
  // that's Long-form has no "which Short platforms" to track. Not an
  // oversight, this field's only meaning is short-form distribution.
  const [platforms, setPlatforms] = useState<string[]>(initialPlatforms);

  function togglePlatform(p: string) {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  const basePlatforms: string[] = [...CONTENT_POST_PLATFORMS];
  const legacyPlatforms = initialPlatforms.filter((p) => !basePlatforms.includes(p));
  const platformOptions = [...basePlatforms, ...legacyPlatforms];

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
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
            {/* Same legacy-value safety net as before: a pre-existing
                item tagged Reel/Post/Thread/Story/Other keeps showing
                its real value instead of silently landing on "Short"
                the next time this form saves for any reason. */}
            {format && !CONTENT_FORMAT_OPTIONS.some((f) => f.value === format) && (
              <option value={format}>{format} (legacy)</option>
            )}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="publish_date">Publish date</Label>
          <Input id="publish_date" name="publish_date" type="datetime-local" defaultValue={publishDateValue} />
        </div>
      </div>

      {format === "Short" && (
        <div className="space-y-1.5">
          <Label>Posted on (select all that apply)</Label>
          <p className="text-xs text-muted-foreground">
            Only the platforms this actually went out on, analytics work off this, not what a Short
            could theoretically go everywhere.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {platformOptions.map((p) => {
              const selected = platforms.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(p)}
                  aria-pressed={selected}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs transition-colors",
                    selected
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p}
                </button>
              );
            })}
          </div>
          {platforms.map((p) => (
            <input key={p} type="hidden" name="platform" value={p} />
          ))}
        </div>
      )}
    </>
  );
}
