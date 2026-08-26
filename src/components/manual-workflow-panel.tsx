"use client";

import { useState } from "react";
import { ResearchPhaseContent } from "@/components/research-phase-content";
import { PackagingPhaseContent } from "@/components/packaging-phase-content";
import { ScriptingPhaseContent } from "@/components/scripting-phase-content";
import { PhaseNav } from "@/components/manual-workflow-ui";
import type {
  ResearchPhaseData,
  PackagingPhaseData,
  ScriptingPhaseData,
} from "@/lib/manual-workflow-parsing";
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
// in full. Phase D (this pass): all three phases now have full
// parsing/display wired up, the build's original four phases (A-D) are
// complete.
//
// Gating reads parsed_data specifically, not just row presence: a row
// can exist (e.g. a raw paste that failed to parse, per the doc's own
// Fallback behavior section) without the phase actually being usable
// input for the next one.
export function ManualWorkflowPanel({
  contentId,
  brand,
  phases,
}: {
  contentId: string;
  brand: string;
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
  const scriptingRow = rowFor("scripting");

  return (
    <div>
      <PhaseNav
        phases={MANUAL_WORKFLOW_PHASES}
        labels={PHASE_LABELS}
        active={activePhase}
        locked={locked}
        onSelect={setActivePhase}
      />

      {/* max-h + overflow-y-auto, not just growing with content: the
          outer page chrome (brand switcher, top bar, the phase pills
          right above this) stays put in the normal document flow, only
          this box scrolls once a phase's content outgrows it. Scripting
          adds its own inner sub-tabs on top of this same box
          (scripting-phase-content.tsx) since two full script versions
          plus short-form/carousel/closing is too much to reasonably
          scroll through as one flat list, even bounded. Plain border,
          not a GlowCard: each phase's own content below is a stack of
          GlowCards, nesting those inside another GlowCard here would be
          glow-in-glow. */}
      <div className="relative mt-4 max-h-[70vh] overflow-y-auto rounded-lg border border-border p-4">
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
            brand={brand}
            data={(packagingRow?.parsed_data as PackagingPhaseData | null) ?? null}
            hasExistingImport={packagingRow != null}
          />
        ) : (
          <ScriptingPhaseContent
            contentId={contentId}
            data={(scriptingRow?.parsed_data as ScriptingPhaseData | null) ?? null}
            status={scriptingRow?.status ?? null}
            hasExistingImport={scriptingRow != null}
          />
        )}
      </div>
    </div>
  );
}
