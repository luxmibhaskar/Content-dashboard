"use client";

import { useState } from "react";
import { AiResearchPhaseContent } from "@/components/ai-research-phase-content";
import { AiPackagingPhaseContent } from "@/components/ai-packaging-phase-content";
import { ScriptsTab } from "@/components/scripts-tab";
import { PhaseNav } from "@/components/manual-workflow-ui";
import type { ResearchCopyVersion, ScriptsVersion } from "@/lib/types";

type AiWorkflowPhase = "research" | "packaging" | "scripting";

const AI_WORKFLOW_PHASES: readonly AiWorkflowPhase[] = ["research", "packaging", "scripting"];

const PHASE_LABELS: Record<AiWorkflowPhase, string> = {
  research: "Research",
  packaging: "Packaging",
  scripting: "Scripting",
};

const LOCK_MESSAGE: Record<AiWorkflowPhase, string> = {
  research: "",
  packaging: "Packaging is locked until Research has been run or pasted in.",
  scripting: "Scripting is locked until an active Research version exists. Run or paste Research, then mark a version active.",
};

// Applies the same Research/Packaging/Scripting phase structure and
// gating as the Manual workflow (manual-workflow-panel.tsx) to the AI
// side, per the follow-up reorganization request: a reshuffle of
// navigation only, not a change to what any AI call generates or
// costs. Replaces the old flat "Research & Copy"/"Scripts" two-tab
// switcher this used to be (research-and-copy-tab.tsx, now deleted,
// its content split across ai-research-phase-content.tsx and
// ai-packaging-phase-content.tsx; scripts-tab.tsx is reused unchanged
// as Scripting's content, it already matched this phase 1:1).
//
// Unlike Manual's three independently-existing DB rows, Research and
// Packaging here are two views into the SAME research_copy_versions
// row: one synthesizeResearchAndCopy call (or one paste) produces
// summary/sources (Research) and titles/description/tags (Packaging)
// together, atomically. So Packaging's lock is real (empty state) but
// can only ever match Research's own empty state, never lag behind it,
// and Packaging has no Run/Paste of its own, see
// ai-packaging-phase-content.tsx. Scripting's lock mirrors the
// `disabled={!activeResearchCopy}` gate scripts-tab.tsx's own Run
// button already had before this reorg, now also surfaced as a nav-
// level lock for visual parity with Manual.
export function AiWorkflowPanel({
  contentId,
  briefIntent,
  keywords,
  researchCopyVersions,
  scriptsVersions,
}: {
  contentId: string;
  briefIntent: string | null;
  keywords: string | null;
  researchCopyVersions: ResearchCopyVersion[];
  scriptsVersions: ScriptsVersion[];
}) {
  const [activePhase, setActivePhase] = useState<AiWorkflowPhase>("research");

  const hasResearch = researchCopyVersions.length > 0;
  const activeResearchCopy = researchCopyVersions.find((v) => v.is_live)?.data ?? null;

  const locked: Record<AiWorkflowPhase, boolean> = {
    research: false,
    packaging: !hasResearch,
    scripting: !activeResearchCopy,
  };

  return (
    <div>
      <PhaseNav
        phases={AI_WORKFLOW_PHASES}
        labels={PHASE_LABELS}
        active={activePhase}
        locked={locked}
        onSelect={setActivePhase}
      />

      {/* Same bounded-scroll container as Manual's own phase box
          (manual-workflow-panel.tsx): outer page chrome stays fixed,
          only the active phase's content scrolls internally. */}
      <div className="relative mt-4 max-h-[70vh] overflow-y-auto rounded-lg border border-border p-4">
        {locked[activePhase] ? (
          <p className="text-sm text-muted-foreground">{LOCK_MESSAGE[activePhase]}</p>
        ) : activePhase === "research" ? (
          <AiResearchPhaseContent
            contentId={contentId}
            briefIntent={briefIntent}
            keywords={keywords}
            versions={researchCopyVersions}
          />
        ) : activePhase === "packaging" ? (
          <AiPackagingPhaseContent contentId={contentId} versions={researchCopyVersions} />
        ) : (
          <ScriptsTab contentId={contentId} activeResearchCopy={activeResearchCopy} versions={scriptsVersions} />
        )}
      </div>
    </div>
  );
}
