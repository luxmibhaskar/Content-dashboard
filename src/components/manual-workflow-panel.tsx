"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResearchPhaseContent } from "@/components/research-phase-content";
import type { ResearchPhaseData } from "@/lib/manual-workflow-parsing";
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

const PHASE_BUILD_STEP: Record<Exclude<ManualWorkflowPhase, "research">, string> = {
  packaging: "Phase C",
  scripting: "Phase D",
};

// docs/manual-workflow-redesign.md: replaces the old Manual paste-panel
// that used to live inside Research & Copy/Scripts (still there for now,
// see topic-page-tabs.tsx) with a phase-gated Research -> Packaging ->
// Scripting workflow matching docs/research-packaging-scripting-template.txt
// in full. Phase B (this pass): Research's own full parsing/display
// (research-phase-content.tsx) is wired up; Packaging/Scripting stay
// placeholders until Phase C/D.
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
          (research-phase-content.tsx), nesting those inside another
          GlowCard here would be glow-in-glow. */}
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
        ) : (
          <PlaceholderPhaseContent phase={activePhase} />
        )}
      </div>
    </div>
  );
}

function PlaceholderPhaseContent({ phase }: { phase: Exclude<ManualWorkflowPhase, "research"> }) {
  return (
    <p className="text-sm text-muted-foreground">
      {PHASE_LABELS[phase]} phase content, parsing, and its own &ldquo;Paste from AI chat&rdquo; import land in{" "}
      {PHASE_BUILD_STEP[phase]} of the build.
    </p>
  );
}
