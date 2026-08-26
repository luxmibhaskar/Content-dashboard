"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const SELECT_CLASSNAME = "h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm";

const CONTENT_FORMAT_OPTIONS: { value: string; label: string }[] = [
  { value: "Short", label: "Short" },
  { value: "Long Video", label: "Long" },
];

// Format + Publish date + (Short and Long) the "posted on" platform
// multiselect, one client component since the multiselect's visibility
// depends on Format's own live value, plain server-rendered selects
// can't react to each other. No nested <form>: like
// pillar-sub-topic-selects.tsx, this renders directly inside the
// topic page's own outer <form>, its inputs (format, publish_date,
// platform x N) submit as part of that same Save. knownPlatforms comes
// from goals.platform_name (Streak & Goals' "add a platform goal" form
// is the one place platform names get typed in freely) and is the only
// source for this list, no static fallback list, per explicit direction:
// the option pool here is meant to be exactly what Goals shows, add or
// delete a platform goal there and this picker reflects it on next load,
// in both Short and Long. initialPlatforms is unioned in too, but only
// so a value already saved on this item never silently disappears from
// its own picker after its goal is deleted elsewhere, not as a second
// source of new options.
export function FormatPlatformFields({
  initialFormat,
  initialPlatforms,
  initialDescription,
  publishDateValue,
  knownPlatforms,
}: {
  initialFormat: string;
  initialPlatforms: string[];
  initialDescription: string;
  publishDateValue: string;
  knownPlatforms: string[];
}) {
  const [format, setFormat] = useState(initialFormat);
  // Kept independent of Format's own value (not reset when Format
  // changes) so switching formats and back before saving doesn't lose
  // what was already picked. Actually saving while Format isn't Short
  // or Long Video does clear it though, on purpose: the hidden inputs
  // below only render while this section is visible, so nothing named
  // "platform" reaches formData.getAll in that case.
  const [platforms, setPlatforms] = useState<string[]>(initialPlatforms);

  function togglePlatform(p: string) {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  // Case-insensitive dedupe: goals aren't constrained to one casing per
  // platform (e.g. "TikTok" vs "Tiktok" from two different goals, or an
  // old saved selection that predates a since-renamed goal), so a plain
  // Set on the raw strings would show what looks like the same platform
  // twice. First match wins, knownPlatforms (Goals, the source of truth)
  // takes priority over initialPlatforms (only there so an already-saved
  // value doesn't vanish once its goal is gone).
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
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="publish_date">Publish date</Label>
          <Input id="publish_date" name="publish_date" type="datetime-local" defaultValue={publishDateValue} />
        </div>
      </div>

      {/* docs/platform-performance-tracking.md Section 3: Short Form's
          title container gets a short description field Long Form's
          never had, first real UI final_description gets (previously
          select-only, read out into the Drive Markdown archive but
          nothing ever wrote it). Short-only on purpose, matching the
          doc's own scoping, not a general-purpose field. */}
      {format === "Short" && (
        <div className="space-y-1.5">
          <Label htmlFor="final_description">Short description</Label>
          <Textarea
            id="final_description"
            name="final_description"
            defaultValue={initialDescription}
            placeholder="A brief description for this Short"
          />
        </div>
      )}

      {(format === "Short" || format === "Long Video") && (
        <div className="space-y-1.5">
          <Label>Posted on (select all that apply)</Label>
          <p className="text-xs text-muted-foreground">
            Only the platforms this actually went out on, analytics work off this. Need a
            platform that isn&apos;t listed? Add it from Streak &amp; Goals&apos; &quot;Add a
            platform goal&quot; form, it&apos;ll show up here too.
          </p>
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
