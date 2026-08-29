"use client";

import Link from "next/link";
import { DropdownMenu } from "radix-ui";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// A compact "select" for filters that are set less often than they're
// read: Content Calendar's Week / Month / Custom range, and Analytics'
// Format and Platform. Folding these into one trigger each keeps a
// filter bar to a single row instead of a stack of pill rows, while a
// lit trigger (nav-link-active, the same accent the top bar's active
// nav item uses) still shows at a glance when a non-default filter is
// applied.
//
// Same construction as the top bar's MoreMenu: Radix DropdownMenu with
// <Link> items via `asChild`, so navigation stays real hrefs (server
// pages keep computing them) and only the open/close needs client JS.
// The menu surface reuses .nav-dropdown-content from globals.css.
const MENU_ITEM_CLASSNAME =
  "block rounded-md px-2 py-1.5 text-sm outline-none hover:bg-muted focus:bg-muted";

export function FilterMenu({
  label,
  triggerLabel,
  active = false,
  options,
}: {
  // Short descriptor shown before the value on the trigger and used as
  // the trigger's accessible name, e.g. "Range", "Format", "Platform".
  label: string;
  // The current selection's label, e.g. "Month", "All formats", "YouTube".
  triggerLabel: string;
  // Whether a non-default (actually narrowing) filter is applied, which
  // lights the trigger so it's obvious even while the menu is closed.
  active?: boolean;
  options: { value: string; label: string; href: string; active: boolean }[];
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm outline-none transition-colors",
            active
              ? "nav-link-active text-foreground"
              : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <span className="text-muted-foreground">{label}:</span>
          <span className="font-medium text-foreground">{triggerLabel}</span>
          <ChevronDown className="size-3.5 shrink-0" aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="nav-dropdown-content z-50 min-w-44 rounded-lg p-1 text-popover-foreground duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2"
        >
          {options.map((opt) => (
            <DropdownMenu.Item key={opt.value} asChild>
              <Link
                href={opt.href}
                className={cn(MENU_ITEM_CLASSNAME, opt.active && "nav-link-active")}
              >
                {opt.label}
              </Link>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
