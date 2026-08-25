import type { ManualWorkflowStatus } from "@/lib/types";

// Shared display primitives for the Manual workflow's three phase
// content components (research-phase-content.tsx, packaging-phase-
// content.tsx, and Scripting's when Phase D lands). Extracted here
// rather than left duplicated in research-phase-content.tsx once a
// second phase needed the same pieces: Field/ListField render this
// template's common "Label: value"/"Label: list" shape, ScoreBadge the
// 0-10 scores every phase has at least one of (Content Opportunities'
// five, Packaging's carousel suitability, Scripting's short-form
// suitability), and StatusBadge the APPROVED/NEEDS REVISION/REJECTED
// line Research and Scripting both end with (Packaging has none, so its
// content component simply never renders one).

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

export function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm leading-relaxed whitespace-pre-wrap">{value}</p>
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
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
