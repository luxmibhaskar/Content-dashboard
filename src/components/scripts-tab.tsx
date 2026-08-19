"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { ResearchCopyResult, ScriptContainer, ScriptsResult } from "@/lib/types";
import { runScripts, type RunScriptsState } from "@/app/(app)/calendar/[id]/scripts-actions";

function ScriptCard({ script, index }: { script: ScriptContainer; index: number }) {
  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <p className="text-sm font-medium">Script {index + 1}</p>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Opening hooks</p>
        <div className="space-y-2">
          {script.hooks.map((h, i) => (
            <p key={i} className="rounded-md border border-border p-2.5 text-sm">
              {h}
            </p>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Script body</p>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{script.body}</p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">CTA options</p>
        <div className="space-y-2">
          {script.ctaOptions.map((c, i) => (
            <p key={i} className="rounded-md border border-border p-2.5 text-sm">
              {c}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

// docs/topic-page-redesign.md Section 2, Tab 2 "Scripts". Own separate
// Run from Tab 1's, disabled until research_copy exists since the
// script's main points are meant to specifically address the pain
// points/questions Tab 1 surfaced, there's nothing to draw from without
// it. Multiple self-contained script containers (short-form) or one
// (long-form), divided the same visual way as Tab 1's source containers.
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
        <div className="space-y-3">
          {scripts.scripts.map((s, i) => (
            <ScriptCard key={i} script={s} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
