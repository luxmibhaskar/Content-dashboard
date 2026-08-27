"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ReferenceVideosSection } from "@/components/reference-videos-section";
import { ProductionStatusTracker } from "@/components/production-status-tracker";
import type { PillarStructure } from "@/lib/pillars";
import type { ProductionStatus, ReferenceVideo } from "@/lib/types";

export type LongFormTopicOption = {
  id: string;
  final_title: string | null;
  pillar: string | null;
  created_at: string;
};

const SELECT_CLASSNAME = "h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm";

const CONTENT_FORMAT_OPTIONS: { value: string; label: string }[] = [
  { value: "Short", label: "Short" },
  { value: "Long Video", label: "Long" },
];

// Format + Publish date + (Short and Long) the "posted on" platform
// multiselect, one client component since the multiselect's visibility
// depends on Format's own live value, plain server-rendered selects
// can't react to each other. knownPlatforms comes from goals.platform_name
// (Streak & Goals' "add a platform goal" form is the one place platform
// names get typed in freely) and is the only source for this list, no
// static fallback list, per explicit direction: the option pool here is
// meant to be exactly what Goals shows, add or delete a platform goal
// there and this picker reflects it on next load, in both Short and
// Long. initialPlatforms is unioned in too, but only so a value already
// saved on this item never silently disappears from its own picker
// after its goal is deleted elsewhere, not as a second source of new
// options.
//
// Topic page restructuring (2026-08-27): Reference Videos moved from a
// TopicPageTabs tab to always-visible, right after Format/Publish date
// for Long Video (no Short Description/Idea Derived From to anchor to
// there), or between Short Description and Idea Derived From for Short.
// Reference Videos has its own Add/Remove/Save-notes forms, which can't
// nest inside another <form> (invalid HTML, and a nested form's submit
// button would silently target the wrong one) - so the real <form id=
// {formId}> now only wraps the tail end this component already owns the
// state for (Idea Derived From, the platform picker, and, since it also
// needs to stay inside a real <form> for its useFormStatus-driven
// loading spinner, the Save button + ProductionStatusTracker). Format,
// Publish date, and Short Description render earlier, detached via the
// native form={formId} attribute rather than DOM nesting, same pattern
// Title/Production status/Pillar/Sub-topic use one level up
// (calendar/[id]/page.tsx) and Analytics and Conversion's Conversions
// field uses one section down (platform-analytics-section.tsx). See
// dirty-form-tracker.tsx for how unsaved-changes tracking still
// reaches all of these despite the split.
export function FormatPlatformFields({
  initialFormat,
  initialPlatforms,
  initialDescription,
  publishDateValue,
  knownPlatforms,
  structure,
  longFormTopics,
  initialPillar,
  initialDerivedFromContentId,
  formId,
  formAction,
  productionStatus,
  contentId,
  referenceVideos,
}: {
  initialFormat: string;
  initialPlatforms: string[];
  initialDescription: string;
  publishDateValue: string;
  knownPlatforms: string[];
  structure: PillarStructure;
  longFormTopics: LongFormTopicOption[];
  initialPillar: string;
  initialDerivedFromContentId: string;
  formId: string;
  formAction: (formData: FormData) => void | Promise<void>;
  productionStatus: ProductionStatus | null;
  contentId: string;
  referenceVideos: ReferenceVideo[];
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
            form={formId}
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
          <Input
            id="publish_date"
            name="publish_date"
            type="datetime-local"
            defaultValue={publishDateValue}
            form={formId}
          />
        </div>
      </div>

      {/* Long Video has no Short Description/Idea Derived From to sit
          between, so it goes right after Format/Publish date instead
          (topic page restructuring, 2026-08-27). */}
      {format === "Long Video" && (
        <ReferenceVideosSection contentId={contentId} videos={referenceVideos} />
      )}

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
            form={formId}
          />
        </div>
      )}

      {format === "Short" && (
        <ReferenceVideosSection contentId={contentId} videos={referenceVideos} />
      )}

      {/* The real <form>: only from here down does this component still
          own literal DOM descendants of it (see the header comment for
          why the split happens here). */}
      <form id={formId} action={formAction} className="space-y-5">
        {/* docs/platform-performance-tracking.md Section 6: a proper
            picker on top of the already-working derived_from_content_id
            field (previously read-only, no UI setter since
            topic-page-redesign.md Section 9 removed System &
            Production). Short-only, matching the doc's own scoping: a
            Long Form item doesn't derive from anything. */}
        {format === "Short" && (
          <DerivedFromPicker
            structure={structure}
            longFormTopics={longFormTopics}
            initialPillar={initialPillar}
            initialValue={initialDerivedFromContentId}
          />
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

        <div className="flex items-center justify-between pt-2">
          <ProductionStatusTracker status={productionStatus} />
          <Button type="submit">Save</Button>
        </div>
      </form>
    </>
  );
}

// docs/platform-performance-tracking.md Section 6: filterable by pillar,
// latest 5 Long Form topics for that pillar. longFormTopics is the
// brand's full Long Form list (fetched once, server-side), filtered and
// sliced here client-side rather than round-tripping per pillar change,
// cheap at this app's real data volume. Pillar filter defaults to
// whichever pillar this item (or, if unset, its already-linked source
// item) belongs to, but is independently browsable, since finding a
// repurposing source can come before this item's own pillar is decided.
function DerivedFromPicker({
  structure,
  longFormTopics,
  initialPillar,
  initialValue,
}: {
  structure: PillarStructure;
  longFormTopics: LongFormTopicOption[];
  initialPillar: string;
  initialValue: string;
}) {
  const pillars = Object.keys(structure);
  const alreadyLinked = longFormTopics.find((t) => t.id === initialValue);
  const defaultFilterPillar = initialPillar || alreadyLinked?.pillar || "";
  const [pillarFilter, setPillarFilter] = useState(defaultFilterPillar);

  const latestFive = longFormTopics.filter((t) => !pillarFilter || t.pillar === pillarFilter).slice(0, 5);
  // Same "never silently lose an already-set value" reasoning as
  // Format's own legacy-value handling: if the currently-linked topic
  // isn't in the latest-5-for-this-pillar slice (a newer topic bumped it
  // out, or it belongs to a different pillar than the current filter),
  // it stays selectable as its own extra option while the filter is on
  // its original pillar, rather than a re-save silently clearing the
  // link.
  const onOriginalFilter = pillarFilter === defaultFilterPillar;
  const options =
    onOriginalFilter && alreadyLinked && !latestFive.some((t) => t.id === alreadyLinked.id)
      ? [alreadyLinked, ...latestFive]
      : latestFive;

  return (
    <div className="space-y-1.5">
      <Label htmlFor="derived_from_content_id">Idea derived from</Label>
      <div className="grid grid-cols-2 gap-2">
        <select
          id="derived_from_pillar_filter"
          aria-label="Filter by pillar"
          value={pillarFilter}
          onChange={(e) => setPillarFilter(e.target.value)}
          className={SELECT_CLASSNAME}
        >
          <option value="">All pillars</option>
          {pillars.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          key={pillarFilter}
          id="derived_from_content_id"
          name="derived_from_content_id"
          defaultValue={onOriginalFilter ? initialValue : ""}
          className={SELECT_CLASSNAME}
        >
          <option value="">None</option>
          {options.map((t) => (
            <option key={t.id} value={t.id}>
              {t.final_title || "Untitled"}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-muted-foreground">Latest 5 Long Form topics for the selected pillar.</p>
    </div>
  );
}
