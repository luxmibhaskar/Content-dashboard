"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { AtomizedShort, ResearchCopyResult, ScriptPointer, ScriptsResult } from "@/lib/types";
import { runScripts, type RunScriptsState } from "@/app/(app)/calendar/[id]/scripts-actions";

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
    <div className="space-y-2 rounded-lg border border-border p-4">
      <p className="text-sm font-medium">
        Short {index + 1}: {short.title}
      </p>
      <PointerList points={short.pointerScript} />
    </div>
  );
}

// docs/topic-page-redesign.md Section 2, Tab 2 "Scripts". Own separate
// Run from Tab 1's, disabled until research_copy exists since the
// script's main points are meant to specifically address the pain
// points/questions Tab 1 surfaced, there's nothing to draw from without
// it. One Run produces the full package: hooks + the pain-point-answer
// line that opens the long-form script, the long-form script itself, a
// condensed pointer-style pass of the same core topic, and however many
// atomized standalone shorts the content actually supports.
export function ScriptsTab({
  contentId,
  researchCopy,
  scripts,
}: {
  contentId: string;
  researchCopy: ResearchCopyResult | null;
  scripts: ScriptsResult | null;
}) {
  const initialRunState: RunScriptsState = { error: null };
  const [runState, runAction, isRunPending] = useActionState(
    runScripts.bind(null, contentId),
    initialRunState,
  );

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
      <div className="flex items-center justify-between gap-2 rounded-lg border border-border p-4">
        <p className="text-sm text-muted-foreground">
          {researchCopy
            ? "Draws its main points from the research and pain points already found in Research & Copy."
            : "Run Research & Copy first, Scripts needs that research to write from."}
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
          <Button type="submit" loading={isRunPending} disabled={!researchCopy}>
            {scripts ? "Run Again" : "Run"}
          </Button>
        </form>
      </div>
      {runState.error && (
        <p className="text-sm text-destructive" role="alert">
          {runState.error}
        </p>
      )}

      {!scripts && researchCopy && (
        <p className="text-sm text-muted-foreground">No scripts yet. Run above to generate them.</p>
      )}

      {scripts && (
        <>
          <div className="space-y-4 rounded-lg border border-border p-4">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Opening hooks</p>
              <div className="space-y-2">
                {scripts.hooks.map((h, i) => (
                  <p key={i} className="rounded-md border border-border p-2.5 text-sm">
                    {h}
                  </p>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Pain-point answer (lands right after the hook)
              </p>
              <p className="rounded-md border border-border p-2.5 text-sm font-medium">
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
                  <p key={i} className="rounded-md border border-border p-2.5 text-sm">
                    {c}
                  </p>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-border p-4">
            <p className="text-sm font-medium">Short-form pass (same topic, condensed)</p>
            <PointerList points={scripts.shortFormPointers} />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">
              Atomized shorts ({scripts.atomizedShorts.length})
            </p>
            <div className="space-y-3">
              {scripts.atomizedShorts.map((s, i) => (
                <AtomizedShortCard key={i} short={s} index={i} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
