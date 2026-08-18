"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CollapsibleSection } from "@/components/collapsible-section";
import { MainPointersEditor } from "@/components/main-pointers-editor";
import { cn } from "@/lib/utils";
import {
  ENERGY_TAG_PRESETS,
  PLATFORMS,
  type MainPoint,
  type PlatformModeEntry,
  type PlatformPublishing,
} from "@/lib/types";

type Tab = "viewer_pov" | "normal_pov" | "recording";

const TAB_LABELS: Record<Tab, string> = {
  viewer_pov: "Viewer POV",
  normal_pov: "Normal POV",
  recording: "Recording Section",
};

const EMPTY_MODE: PlatformModeEntry = {};

function ModeFields({
  platform,
  entry,
  onChange,
}: {
  platform: string;
  entry: PlatformModeEntry;
  onChange: (patch: Partial<PlatformModeEntry>) => void;
}) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-xs font-medium text-muted-foreground">{platform}</p>
      <div className="mt-2 space-y-2">
        <Input
          placeholder="Title"
          value={entry.title ?? ""}
          onChange={(e) => onChange({ title: e.target.value })}
        />
        <Textarea
          rows={2}
          placeholder="Description"
          value={entry.description ?? ""}
          onChange={(e) => onChange({ description: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="Short keywords / tags"
            value={entry.short_keywords ?? ""}
            onChange={(e) => onChange({ short_keywords: e.target.value })}
          />
          <Input
            placeholder="Question-style keywords"
            value={entry.question_keywords ?? ""}
            onChange={(e) => onChange({ question_keywords: e.target.value })}
          />
        </div>
        <Input
          placeholder="Angle line (optional)"
          value={entry.angle_line ?? ""}
          onChange={(e) => onChange({ angle_line: e.target.value })}
        />
      </div>
    </div>
  );
}

// Section 10.1.4 (Viewer POV / Normal POV) + 10.1.5 (Recording Section):
// a horizontal tab row instead of three stacked collapsible sections, per
// explicit request, the rest of the page's collapse behavior is
// unchanged. All three panels stay mounted (toggled with a CSS class,
// not conditional rendering) so switching tabs never drops an edit in
// the panel you're leaving, every field here still submits with the
// same page-level form regardless of which tab is currently visible.
export function PublishingAndRecordingTabs({
  platformPublishingName,
  initialPlatformPublishing,
  mainPointersName,
  initialMainPoints,
  item,
}: {
  platformPublishingName: string;
  initialPlatformPublishing: PlatformPublishing;
  mainPointersName: string;
  initialMainPoints: MainPoint[];
  item: { energy_tag: string | null; full_script: string | null; voice_memo_transcript: string | null };
}) {
  const [tab, setTab] = useState<Tab>("viewer_pov");
  const [platformPublishing, setPlatformPublishing] = useState<PlatformPublishing>(
    initialPlatformPublishing,
  );

  function updateField(platform: string, mode: "viewer_pov" | "normal_pov", patch: Partial<PlatformModeEntry>) {
    setPlatformPublishing((prev) => ({
      ...prev,
      [platform]: {
        viewer_pov: { ...prev[platform]?.viewer_pov, ...(mode === "viewer_pov" ? patch : {}) },
        normal_pov: { ...prev[platform]?.normal_pov, ...(mode === "normal_pov" ? patch : {}) },
      },
    }));
  }

  return (
    <div>
      <input type="hidden" name={platformPublishingName} value={JSON.stringify(platformPublishing)} />

      <div className="flex gap-2 border-b border-border pb-3">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-md px-2.5 py-1 text-sm transition-all duration-150 ease-out active:scale-95",
              tab === t
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <div className={cn("mt-4 space-y-3", tab !== "viewer_pov" && "hidden")}>
        <p className="text-xs text-muted-foreground">
          Algorithm/platform-optimized: SEO title, description, short and question-style
          keyword variants, tuned to each platform&apos;s current discovery patterns.
        </p>
        {PLATFORMS.map((platform) => (
          <ModeFields
            key={platform}
            platform={platform}
            entry={platformPublishing[platform]?.viewer_pov ?? EMPTY_MODE}
            onChange={(patch) => updateField(platform, "viewer_pov", patch)}
          />
        ))}
      </div>

      <div className={cn("mt-4 space-y-3", tab !== "normal_pov" && "hidden")}>
        <p className="text-xs text-muted-foreground">
          Plain and direct: the same fields with no algorithm framing, straightforwardly
          answering the topic.
        </p>
        {PLATFORMS.map((platform) => (
          <ModeFields
            key={platform}
            platform={platform}
            entry={platformPublishing[platform]?.normal_pov ?? EMPTY_MODE}
            onChange={(patch) => updateField(platform, "normal_pov", patch)}
          />
        ))}
      </div>

      <div className={cn("mt-4 space-y-4", tab !== "recording" && "hidden")}>
        <div className="space-y-1.5">
          <Label htmlFor="voice_memo_transcript">Voice memo transcript</Label>
          <p className="text-xs text-muted-foreground">
            Manual for now, paste or type a transcript here. The actual &quot;just
            talk&quot; record-and-transcribe button is a separate, bigger piece (browser
            audio capture + speech-to-text) not built yet.
          </p>
          <Textarea
            id="voice_memo_transcript"
            name="voice_memo_transcript"
            defaultValue={item.voice_memo_transcript ?? ""}
            rows={3}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="energy_tag">Energy tag</Label>
          <input
            id="energy_tag"
            name="energy_tag"
            list="energy-tag-options"
            defaultValue={item.energy_tag ?? ""}
            placeholder="Calm, Direct, High Energy, or your own"
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
          />
          <datalist id="energy-tag-options">
            {ENERGY_TAG_PRESETS.map((preset) => (
              <option key={preset} value={preset} />
            ))}
          </datalist>
        </div>

        <CollapsibleSection title="Main Pointers" defaultOpen={initialMainPoints.length > 0}>
          <MainPointersEditor name={mainPointersName} initialPoints={initialMainPoints} />
        </CollapsibleSection>

        <CollapsibleSection title="Full Script" defaultOpen={Boolean(item.full_script)}>
          <Textarea
            id="full_script"
            name="full_script"
            defaultValue={item.full_script ?? ""}
            rows={8}
            placeholder="Word-for-word script, including delivery notes: what to emphasize, what to avoid, pacing cues."
          />
        </CollapsibleSection>
      </div>
    </div>
  );
}
