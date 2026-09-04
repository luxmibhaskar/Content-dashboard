"use client";

import { useState } from "react";
import { ResearchPhaseContent } from "@/components/research-phase-content";
import { PackagingPhaseContent } from "@/components/packaging-phase-content";
import { ScriptingPhaseContent } from "@/components/scripting-phase-content";
import { ContentNotesSection } from "@/components/content-notes-section";
import { PhaseNav } from "@/components/manual-workflow-ui";
import type {
  ResearchPhaseData,
  PackagingPhaseData,
  ScriptingPhaseData,
} from "@/lib/manual-workflow-parsing";
import {
  MANUAL_WORKFLOW_PHASES,
  type ContentNote,
  type ManualWorkflowPhase,
  type ManualWorkflowPhaseRow,
} from "@/lib/types";

// docs/topic-page-redesign.md Section 11: Notes rides along as a 4th tab
// in this same pill row, not a manual_workflow_phases row - it's
// item-scoped, so it appears identically on the AI panel too
// (ai-workflow-panel.tsx). MANUAL_WORKFLOW_PHASES itself is left alone
// (it backs the manual_workflow_phase_type DB enum).
const PANEL_TABS = [...MANUAL_WORKFLOW_PHASES, "notes"] as const;
type PanelTab = (typeof PANEL_TABS)[number];

const PHASE_LABELS: Record<PanelTab, string> = {
  research: "Research",
  packaging: "Packaging",
  scripting: "Scripting",
  notes: "Notes",
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
  notes,
}: {
  contentId: string;
  brand: string;
  phases: ManualWorkflowPhaseRow[];
  notes: ContentNote[];
}) {
  const [activePhase, setActivePhase] = useState<PanelTab>("research");

  const rowFor = (phase: ManualWorkflowPhase) => phases.find((p) => p.phase === phase);
  const isDone = (phase: ManualWorkflowPhase) => rowFor(phase)?.parsed_data != null;

  const locked: Record<PanelTab, boolean> = {
    research: false,
    packaging: !isDone("research"),
    scripting: !isDone("packaging"),
    notes: false,
  };

  const researchRow = rowFor("research");
  const packagingRow = rowFor("packaging");
  const scriptingRow = rowFor("scripting");

  return (
    <div>
      <PhaseNav
        phases={PANEL_TABS}
        labels={PHASE_LABELS}
        active={activePhase}
        locked={locked}
        onSelect={setActivePhase}
        detachedTail="notes"
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
        {activePhase === "notes" ? (
          <ContentNotesSection contentId={contentId} notes={notes} />
        ) : locked[activePhase] ? (
          <p className="text-sm text-muted-foreground">{LOCK_MESSAGE[activePhase]}</p>
        ) : activePhase === "research" ? (
          <ResearchPhaseContent
            contentId={contentId}
            data={(researchRow?.parsed_data as ResearchPhaseData | null) ?? null}
            status={researchRow?.status ?? null}
            hasExistingImport={researchRow != null}
            rawPastedText={researchRow?.raw_pasted_text ?? null}
          />
        ) : activePhase === "packaging" ? (
          <PackagingPhaseContent
            contentId={contentId}
            brand={brand}
            data={(packagingRow?.parsed_data as PackagingPhaseData | null) ?? null}
            status={packagingRow?.status ?? null}
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
