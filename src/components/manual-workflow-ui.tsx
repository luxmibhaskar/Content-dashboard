import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ManualWorkflowStatus } from "@/lib/types";

// Shared display primitives, originally built for the Manual workflow's
// three phase content components (research-phase-content.tsx,
// packaging-phase-content.tsx, scripting-phase-content.tsx) and now also
// reused by the AI side's own phase-gated reorganization
// (ai-workflow-panel.tsx and friends): Field/ListField render the
// common "Label: value"/"Label: list" shape, ScoreBadge the 0-10 scores
// (Manual-only, nothing on the AI side has these), StatusBadge the
// APPROVED/NEEDS REVISION/REJECTED line (also Manual-only), MarkerText
// the anti-fabrication bracket markers (Manual-only, the AI prompts
// never emit these literally), and PhaseNav the pill-switcher-with-
// lock-icons pattern both sides' top-level phase navigation uses.

const STATUS_LABELS: Record<ManualWorkflowStatus, string> = {
  approved: "Approved",
  needs_revision: "Needs Revision",
  rejected: "Rejected",
};

const STATUS_CLASSES: Record<ManualWorkflowStatus, string> = {
  approved: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  needs_revision: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  rejected: "bg-destructive/15 text-destructive",
};

export function StatusBadge({ status }: { status: ManualWorkflowStatus | null }) {
  if (!status) {
    return (
      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
        Not yet rated
      </span>
    );
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_CLASSES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

// 0-10 scores, per docs/manual-workflow-redesign.md's "render as small
// visible bars or badges, not plain numbers in a paragraph": a filled
// bar reads at a glance, and doubles as a color cue (low scores read
// visibly weaker, not just numerically) without needing separate colors
// to memorize.
export function ScoreBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.max(0, Math.min(10, value)) * 10}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-xs font-medium">{value}/10</span>
    </div>
  );
}

// docs/manual-workflow-redesign.md's "single most important visual
// treatment in this whole feature": these three markers are the
// template's anti-fabrication safety net, so wherever they appear in
// parsed text they render as a distinct colored badge instead of
// blending into the surrounding sentence as plain bracketed text.
// Three different colors, not one shared "flag" color, so the three
// stay visually distinguishable from each other at a glance too.
const MARKER_PATTERN = /(\[VERIFY\]|\[PERSONAL INPUT NEEDED\]|\[EXAMPLE NEEDED\])/g;

const MARKER_CLASSES: Record<string, string> = {
  "[VERIFY]": "bg-amber-500/20 text-amber-600 dark:text-amber-400 ring-1 ring-inset ring-amber-500/40",
  "[PERSONAL INPUT NEEDED]":
    "bg-violet-500/20 text-violet-600 dark:text-violet-400 ring-1 ring-inset ring-violet-500/40",
  "[EXAMPLE NEEDED]": "bg-sky-500/20 text-sky-600 dark:text-sky-400 ring-1 ring-inset ring-sky-500/40",
};

export function MarkerText({ text }: { text: string }) {
  if (!text) return null;
  const parts = text.split(MARKER_PATTERN);
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((part, i) => {
        const cls = MARKER_CLASSES[part];
        if (!cls) return part ? <span key={i}>{part}</span> : null;
        return (
          <span
            key={i}
            className={`mx-0.5 inline-flex items-center rounded px-1.5 py-0.5 align-middle text-[10px] font-semibold tracking-wide whitespace-nowrap ${cls}`}
          >
            {part.slice(1, -1)}
          </span>
        );
      })}
    </>
  );
}

export function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm leading-relaxed whitespace-pre-wrap">
        <MarkerText text={value} />
      </p>
    </div>
  );
}

export function ListField({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {items.length === 0 ? (
        <p className="mt-0.5 text-sm text-muted-foreground">None found.</p>
      ) : (
        <ul className="mt-1 list-disc space-y-1 pl-4">
          {items.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed">
              <MarkerText text={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// The pill-switcher-with-lock-icons pattern both Manual's and AI's
// top-level phase navigation use (manual-workflow-panel.tsx,
// ai-workflow-panel.tsx): a phase list, which one's active, and which
// are locked, generic over the specific phase union each side defines
// since "research"/"packaging"/"scripting" happen to read the same as
// labels but are two unrelated string-literal types.
export function PhaseNav<P extends string>({
  phases,
  labels,
  active,
  locked,
  onSelect,
}: {
  phases: readonly P[];
  labels: Record<P, string>;
  active: P;
  locked: Record<P, boolean>;
  onSelect: (phase: P) => void;
}) {
  return (
    // Made more prominent (topic page restructuring, 2026-08-27): a
    // background tint and shadow so this reads as a real sub-navigation,
    // not a subtle 1px pill. One notch lighter than the Manual/AI
    // toggle above it (topic-page-tabs.tsx) on purpose, to preserve the
    // hierarchy: that picks the side, this picks the phase within it.
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted/30 p-0.5 shadow-sm">
      {phases.map((phase) => (
        <Button
          key={phase}
          type="button"
          size="sm"
          variant={active === phase ? "default" : "ghost"}
          onClick={() => onSelect(phase)}
        >
          {locked[phase] && <Lock className="size-3" aria-hidden="true" />}
          {labels[phase]}
        </Button>
      ))}
    </div>
  );
}
