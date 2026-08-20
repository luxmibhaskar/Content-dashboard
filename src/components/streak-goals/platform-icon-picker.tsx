"use client";

import { useState } from "react";
import { Popover } from "radix-ui";
import { PLATFORM_ICONS, findPlatformIcon } from "@/lib/platform-icons";
import { cn } from "@/lib/utils";

// Streak & Goals redesign: "pick from a set" icon source for a platform
// goal, Simple Icons (real brand logos), not this app's usual Lucide,
// per explicit direction, see src/lib/platform-icons.ts. "Upload your
// own" is deferred, name is still typed freely in a sibling field, this
// only picks the icon.
export function PlatformIconPicker({ name, defaultSlug }: { name: string; defaultSlug?: string | null }) {
  const [slug, setSlug] = useState(defaultSlug ?? "");
  const selectedIcon = findPlatformIcon(slug);

  return (
    <Popover.Root>
      <input type="hidden" name={name} value={slug} />
      <Popover.Trigger asChild>
        <button
          type="button"
          className="flex size-8 shrink-0 items-center justify-center rounded-md border border-input bg-background text-muted-foreground hover:text-foreground"
          aria-label="Choose an icon"
        >
          {selectedIcon ? (
            <selectedIcon.Icon className="size-4" />
          ) : (
            <span className="text-xs">?</span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-50 w-64 rounded-lg border border-border bg-popover p-2 text-popover-foreground shadow-md"
        >
          <div className="grid grid-cols-6 gap-1">
            {PLATFORM_ICONS.map(({ slug: s, label, Icon }) => (
              <Popover.Close asChild key={s}>
                <button
                  type="button"
                  title={label}
                  onClick={() => setSlug(s)}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-md hover:bg-muted",
                    slug === s && "bg-muted text-primary",
                  )}
                >
                  <Icon className="size-4" />
                </button>
              </Popover.Close>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
