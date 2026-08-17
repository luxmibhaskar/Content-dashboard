"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CollapsibleSection } from "@/components/collapsible-section";
import { PLATFORMS, type PlatformPublishing, type PlatformPublishingEntry } from "@/lib/types";

export function PlatformPublishingEditor({
  name,
  initialValue,
}: {
  name: string;
  initialValue: PlatformPublishing;
}) {
  const [value, setValue] = useState<PlatformPublishing>(initialValue);

  function updateField(
    platform: string,
    field: keyof PlatformPublishingEntry,
    fieldValue: string,
  ) {
    setValue((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], [field]: fieldValue },
    }));
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(value)} />
      {PLATFORMS.map((platform) => {
        const entry = value[platform] ?? {};
        const hasContent = Boolean(
          entry.platform_title ||
            entry.platform_description ||
            entry.platform_tags_hashtags ||
            entry.platform_angle_line,
        );
        return (
          <CollapsibleSection key={platform} title={platform} defaultOpen={hasContent}>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={entry.platform_title ?? ""}
                onChange={(e) => updateField(platform, "platform_title", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={entry.platform_description ?? ""}
                onChange={(e) => updateField(platform, "platform_description", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tags / hashtags</Label>
              <Input
                value={entry.platform_tags_hashtags ?? ""}
                onChange={(e) => updateField(platform, "platform_tags_hashtags", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Angle line (optional)</Label>
              <Input
                value={entry.platform_angle_line ?? ""}
                onChange={(e) => updateField(platform, "platform_angle_line", e.target.value)}
              />
            </div>
          </CollapsibleSection>
        );
      })}
    </div>
  );
}
