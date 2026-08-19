"use client";

import { useState } from "react";
import { DropdownMenu } from "radix-ui";
import { ChevronDown, X } from "lucide-react";
import { PILLAR_STRUCTURE } from "@/lib/pillars";
import type { Brand } from "@/lib/brand";

// Competitors "Add Competitor" / edit forms: tag-input pattern, not a
// wall of checkboxes. Open the dropdown, pick a sub-topic, it moves out
// of the dropdown's remaining options and becomes a removable chip;
// removing a chip's X returns that sub-topic to the dropdown. Grouped by
// pillar within the dropdown for readability, same PILLAR_STRUCTURE data
// source as before. Hidden inputs live outside the dropdown's portal
// (Radix renders Content into document.body), so form submission still
// just sees name="sub_topics" values via formData.getAll, unchanged from
// the checkbox version.
export function SubTopicMultiSelect({
  brand,
  initialSubTopics,
}: {
  brand: Brand;
  initialSubTopics: string[];
}) {
  const structure = PILLAR_STRUCTURE[brand];
  const [subTopics, setSubTopics] = useState<string[]>(initialSubTopics);
  const selected = new Set(subTopics);

  function add(sub: string) {
    setSubTopics((prev) => (prev.includes(sub) ? prev : [...prev, sub]));
  }

  function remove(sub: string) {
    setSubTopics((prev) => prev.filter((s) => s !== sub));
  }

  const hasRemaining = Object.values(structure)
    .flat()
    .some((s) => !selected.has(s));

  return (
    <div className="space-y-2">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-sm text-muted-foreground outline-none hover:text-foreground aria-expanded:text-foreground"
          >
            + Add sub-topic
            <ChevronDown className="size-3.5" aria-hidden="true" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={6}
            className="z-50 max-h-72 min-w-56 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md"
          >
            {!hasRemaining && (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">All sub-topics added.</p>
            )}
            {Object.entries(structure).map(([pillar, subs]) => {
              const remaining = subs.filter((s) => !selected.has(s));
              if (remaining.length === 0) return null;
              return (
                <DropdownMenu.Group key={pillar}>
                  <DropdownMenu.Label className="px-2 py-1 text-xs font-medium text-muted-foreground">
                    {pillar}
                  </DropdownMenu.Label>
                  {remaining.map((sub) => (
                    <DropdownMenu.Item
                      key={sub}
                      // Prevents Radix's default close-on-select, this is
                      // a multi-pick session, closing after every single
                      // choice would defeat the point of a tag input.
                      onSelect={(e) => {
                        e.preventDefault();
                        add(sub);
                      }}
                      className="cursor-pointer rounded-md px-2 py-1.5 text-sm outline-none hover:bg-muted focus:bg-muted"
                    >
                      {sub}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Group>
              );
            })}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {subTopics.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {subTopics.map((sub) => (
            <span
              key={sub}
              className="flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs"
            >
              {sub}
              <button
                type="button"
                onClick={() => remove(sub)}
                aria-label={`Remove ${sub}`}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
              <input type="hidden" name="sub_topics" value={sub} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
