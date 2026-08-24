"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/glow-card";
import { PasteImportSection } from "@/components/paste-import-section";
import type { AtomizedShort, ResearchCopyResult, ScriptPointer, ScriptsVersion, VersionSource } from "@/lib/types";
import {
  runScripts,
  importScriptsPaste,
  setActiveScriptsVersion,
  type RunScriptsState,
} from "@/app/(app)/calendar/[id]/scripts-actions";

const SCRIPTS_PASTE_TEMPLATE_HINT = `Expects these headers, each on its own line, in this order:
HOOKS / PAIN-POINT ANSWER / LONG-FORM SCRIPT / CTA OPTIONS / SHORT-FORM POINTERS / ATOMIZED SHORTS (optional).
Hooks and CTA options as numbered or bulleted lists. Short-form pointers as "Point: ... | Explanation: ..." lines.
Atomized shorts as "### Short 1: <title>" blocks, each followed by its own Point/Explanation lines.
See docs/topic-page-redesign.md Section 7.`;

const VERSION_LABELS: Record<VersionSource, string> = {
  manual: "Manual",
  ai: "AI Research",
};

function PointerList({ points }: { points: ScriptPointer[] }) {
  return (
    <div className="space-y-2">
      {points.map((p, i) => (
        <div key={i} className="rounded-md border border-border p-2.5">
          <p className="text-sm font-medium">{p.point}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{p.explanation}</p>
        </div>
      ))}
    </div>
  );
}

function AtomizedShortCard({ short, index }: { short: AtomizedShort; index: number }) {
  return (
    <GlowCard glow={((index % 3) + 1) as 1 | 2 | 3} className="space-y-2 p-4" textHeavy>
      <p className="text-sm font-medium">
        Short {index + 1}: {short.title}
      </p>
      <PointerList points={short.pointerScript} />
    </GlowCard>
  );
}

// docs/topic-page-redesign.md Section 7: Manual and AI Research coexist
// as two separate, always-visible panels, same is_live/"active" concept
// as Research & Copy's own panels, independent flag from it. Nothing
// currently reads scripts_versions.is_live programmatically (unlike
// research_copy_versions', which Scripts' own Run reads), this is here
// for UI clarity and symmetry with Research & Copy.
function VersionPanel({
  contentId,
  source,
  version,
}: {
  contentId: string;
  source: VersionSource;
  version: ScriptsVersion | undefined;
}) {
  const boundSetActive = setActiveScriptsVersion.bind(null, contentId, source);
  const scripts = version?.data;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{VERSION_LABELS[source]}</p>
        {version &&
          (version.is_live ? (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
              Active
            </span>
          ) : (
            <form action={boundSetActive}>
              <Button type="submit" size="xs" variant="ghost">
                Make active
              </Button>
            </form>
          ))}
      </div>

      {!scripts ? (
        <p className="text-xs text-muted-foreground">
          {source === "manual" ? "Nothing pasted yet." : "Nothing run yet."}
        </p>
      ) : (
        <div className="space-y-3">
          <GlowCard glow={2} className="space-y-4 p-3.5" textHeavy>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Opening hooks</p>
              <div className="space-y-2">
                {scripts.hooks.map((h, i) => (
                  <p key={i} className="rounded-md border border-border p-2 text-sm">
                    {h}
                  </p>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Pain-point answer (lands right after the hook)
              </p>
              <p className="rounded-md border border-border p-2 text-sm font-medium">
                {scripts.painPointAnswer}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Long-form script</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{scripts.longFormScript}</p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">CTA options (end of long-form script)</p>
              <div className="space-y-2">
                {scripts.ctaOptions.map((c, i) => (
                  <p key={i} className="rounded-md border border-border p-2 text-sm">
                    {c}
                  </p>
                ))}
              </div>
            </div>
          </GlowCard>

          <GlowCard glow={3} className="space-y-2 p-3.5" textHeavy>
            <p className="text-xs font-medium text-muted-foreground">Short-form pass (same topic, condensed)</p>
            <PointerList points={scripts.shortFormPointers} />
          </GlowCard>

          {scripts.atomizedShorts.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground">
                Atomized shorts ({scripts.atomizedShorts.length})
              </p>
              <div className="space-y-3">
                {scripts.atomizedShorts.map((s, i) => (
                  <AtomizedShortCard key={i} short={s} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// docs/topic-page-redesign.md Section 2, Tab 2 "Scripts". Own separate
// Run from Tab 1's, disabled until an active research version exists
// since the script's main points are meant to specifically address the
// pain points/questions that active research surfaced, there's nothing
// to draw from without it. One Run produces the full package: hooks +
// the pain-point-answer line that opens the long-form script, the
// long-form script itself, a condensed pointer-style pass of the same
// core topic, and however many atomized standalone shorts the content
// actually supports.
export function ScriptsTab({
  contentId,
  activeResearchCopy,
  versions,
}: {
  contentId: string;
  activeResearchCopy: ResearchCopyResult | null;
  versions: ScriptsVersion[];
}) {
  const manual = versions.find((v) => v.source === "manual");
  const ai = versions.find((v) => v.source === "ai");

  const initialRunState: RunScriptsState = { error: null };
  const [runState, runAction, isRunPending] = useActionState(
    runScripts.bind(null, contentId),
    initialRunState,
  );
  const boundImportPaste = importScriptsPaste.bind(null, contentId);

  // Same belt-and-suspenders double-submit guard as Tab 1's Run, this
  // call is a real API cost too and can't be cancelled once in flight.
  // Reset in an effect, not during render, mutating a ref mid-render is
  // an anti-pattern React's own hooks lint flags as a hard error.
  const isSubmittingRef = useRef(false);
  useEffect(() => {
    if (!isRunPending) {
      isSubmittingRef.current = false;
    }
  }, [isRunPending]);

  return (
    <div className="space-y-5">
      <GlowCard glow={1} className="space-y-3 p-4" textHeavy>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {activeResearchCopy
              ? "Draws its main points from the currently active Research & Copy version's pain points."
              : "Run or paste Research & Copy first (and mark one active), Scripts needs that research to write from."}
          </p>
          <form
            action={runAction}
            onSubmit={(e) => {
              if (isSubmittingRef.current) {
                e.preventDefault();
                return;
              }
              isSubmittingRef.current = true;
            }}
          >
            <Button type="submit" loading={isRunPending} disabled={!activeResearchCopy}>
              {ai ? "Run Again" : "Run"}
            </Button>
          </form>
        </div>
        {runState.error && (
          <p className="text-sm text-destructive" role="alert">
            {runState.error}
          </p>
        )}
        <PasteImportSection action={boundImportPaste} templateHint={SCRIPTS_PASTE_TEMPLATE_HINT} />
      </GlowCard>

      {!manual && !ai ? (
        <p className="text-sm text-muted-foreground">No scripts yet. Run above to generate them, or paste one in.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <VersionPanel contentId={contentId} source="manual" version={manual} />
          <VersionPanel contentId={contentId} source="ai" version={ai} />
        </div>
      )}
    </div>
  );
}
