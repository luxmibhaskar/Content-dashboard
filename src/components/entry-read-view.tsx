"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/glow-card";
import { cn } from "@/lib/utils";

// Shared shell for the read-only view of a saved Journey Log entry, Idea,
// or Weekly Review. Tapping a saved entry lands here, not in the editable
// form: a clean summary with one clear "Edit" action that navigates to
// ?edit=1 (the page re-renders the real form server-side). The three
// sections render genuinely different fields, so each passes its own
// summary markup as children/header; this component only owns the shared
// parts, the card, the Edit button, and clamping a long summary behind a
// "Show more" toggle.
export function EntryReadView({
  editHref,
  editLabel = "Edit",
  header,
  children,
  footer,
  clampPx = 360,
}: {
  editHref: string;
  editLabel?: string;
  // Rendered top-left, opposite the Edit button (date, title, status
  // badge, week range, whatever identifies the entry at a glance).
  header?: React.ReactNode;
  children: React.ReactNode;
  // Rendered full-width below the (possibly clamped) body and always
  // fully visible, for actions that belong with the entry but aren't
  // fields (e.g. Idea's Transfer to Calendar).
  footer?: React.ReactNode;
  clampPx?: number;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const check = () => setOverflows(el.scrollHeight > clampPx + 1);
    check();
    // Content height can change after mount (fonts, images, a brand
    // switch re-rendering pills), so keep the toggle decision live.
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [clampPx]);

  const collapsed = overflows && !expanded;

  return (
    <GlowCard neutral className="mt-4 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">{header}</div>
        <Button asChild size="sm" variant="outline">
          <Link href={editHref} data-icon="inline-start">
            <Pencil aria-hidden="true" />
            {editLabel}
          </Link>
        </Button>
      </div>

      <div
        ref={bodyRef}
        className={cn("mt-3 space-y-4 text-sm", collapsed && "overflow-hidden")}
        style={
          collapsed
            ? {
                maxHeight: clampPx,
                // Fade the content itself to transparent rather than
                // overlaying a background-colored gradient, so it stays
                // correct across both themes and both brands' neutral
                // card tints without matching any of them.
                maskImage:
                  "linear-gradient(to bottom, black calc(100% - 3rem), transparent)",
                WebkitMaskImage:
                  "linear-gradient(to bottom, black calc(100% - 3rem), transparent)",
              }
            : undefined
        }
      >
        {children}
      </div>

      {overflows && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}

      {footer && <div className="mt-4">{footer}</div>}
    </GlowCard>
  );
}

// Small labelled prose block used inside the read views. Renders nothing
// when the value is empty, so an entry with only two of five fields
// filled shows just those two, no empty rows.
export function ReadField({
  label,
  value,
  className,
}: {
  label: string;
  value?: string | null;
  className?: string;
}) {
  if (!value || !value.trim()) return null;
  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="whitespace-pre-wrap">{value}</p>
    </div>
  );
}
