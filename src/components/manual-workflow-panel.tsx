"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResearchPhaseContent } from "@/components/research-phase-content";
import { PackagingPhaseContent } from "@/components/packaging-phase-content";
import type { ResearchPhaseData, PackagingPhaseData } from "@/lib/manual-workflow-parsing";
import {
  MANUAL_WORKFLOW_PHASES,
  type ManualWorkflowPhase,
  type ManualWorkflowPhaseRow,
} from "@/lib/types";

const PHASE_LABELS: Record<ManualWorkflowPhase, string> = {
  research: "Research",
  packaging: "Packaging",
  scripting: "Scripting",
};

const LOCK_MESSAGE: Record<ManualWorkflowPhase, string> = {
  research: "",
  packaging: "Packaging is locked until Research is pasted in and parsed.",
  scripting: "Scripting is locked until Packaging is pasted in and parsed.",
};

// docs/manual-workflow-redesign.md: replaces the old Manual paste-panel
// that used to live inside Research & Copy/Scripts (still there for now,
// see topic-page-tabs.tsx) with a phase-gated Research -> Packaging ->
// Scripting workflow matching docs/research-packaging-scripting-template.txt
// in full. Phase C (this pass): Research and Packaging both have full
// parsing/display wired up; Scripting stays a placeholder until Phase D.
//
// Gating reads parsed_data specifically, not just row presence: a row
// can exist (e.g. a raw paste that failed to parse, per the doc's own
// Fallback behavior section) without the phase actually being usable
// input for the next one.
export function ManualWorkflowPanel({
  contentId,
  phases,
}: {
  contentId: string;
  phases: ManualWorkflowPhaseRow[];
}) {
  const [activePhase, setActivePhase] = useState<ManualWorkflowPhase>("research");

  const rowFor = (phase: ManualWorkflowPhase) => phases.find((p) => p.phase === phase);
  const isDone = (phase: ManualWorkflowPhase) => rowFor(phase)?.parsed_data != null;

  const locked: Record<ManualWorkflowPhase, boolean> = {
    research: false,
    packaging: !isDone("research"),
    scripting: !isDone("packaging"),
  };

  const researchRow = rowFor("research");
  const packagingRow = rowFor("packaging");

  return (
    <div>
      <div className="inline-flex items-center gap-0.5 rounded-lg border border-border p-0.5">
        {MANUAL_WORKFLOW_PHASES.map((phase) => (
          <Button
            key={phase}
            type="button"
            size="sm"
            variant={activePhase === phase ? "default" : "ghost"}
            onClick={() => setActivePhase(phase)}
          >
            {locked[phase] && <Lock className="size-3" aria-hidden="true" />}
            {PHASE_LABELS[phase]}
          </Button>
        ))}
      </div>

      {/* max-h + overflow-y-auto, not just growing with content: the
          outer page chrome (brand switcher, top bar, the phase pills
          right above this) stays put in the normal document flow, only
          this box scrolls once a phase's content (Scripting especially,
          two full script versions) outgrows it. Plain border, not a
          GlowCard: each phase's own content below is a stack of GlowCards
          (research-phase-content.tsx, packaging-phase-content.tsx),
          nesting those inside another GlowCard here would be
          glow-in-glow. */}
      <div className="mt-4 max-h-[70vh] overflow-y-auto rounded-lg border border-border p-4">
        {locked[activePhase] ? (
          <p className="text-sm text-muted-foreground">{LOCK_MESSAGE[activePhase]}</p>
        ) : activePhase === "research" ? (
          <ResearchPhaseContent
            contentId={contentId}
            data={(researchRow?.parsed_data as ResearchPhaseData | null) ?? null}
            status={researchRow?.status ?? null}
            hasExistingImport={researchRow != null}
          />
        ) : activePhase === "packaging" ? (
          <PackagingPhaseContent
            contentId={contentId}
            data={(packagingRow?.parsed_data as PackagingPhaseData | null) ?? null}
            hasExistingImport={packagingRow != null}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Scripting phase content, parsing, and its own &ldquo;Paste from AI chat&rdquo; import land
            in Phase D of the build.
          </p>
        )}
      </div>
    </div>
  );
}
