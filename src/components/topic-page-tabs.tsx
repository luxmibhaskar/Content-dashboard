"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ResearchAndCopyTab } from "@/components/research-and-copy-tab";
import { ScriptsTab } from "@/components/scripts-tab";
import { ReferenceVideosSection } from "@/components/reference-videos-section";
import { ManualWorkflowPanel } from "@/components/manual-workflow-panel";
import type {
  ManualWorkflowPhaseRow,
  ReferenceVideo,
  ResearchCopyVersion,
  ScriptsVersion,
} from "@/lib/types";

type Area = "ai" | "manual" | "videos";
type AiTab = "research" | "scripts";

const AI_TAB_LABELS: Record<AiTab, string> = {
  research: "Research & Copy",
  scripts: "Scripts",
};

// docs/manual-workflow-redesign.md: restructures the topic page's top
// level from the flat Research & Copy / Scripts / Reference Videos pill
// (docs/topic-page-redesign.md Section 2, as amended for Reference
// Videos) to a Manual/AI toggle plus Reference Videos alongside it,
// since Reference Videos belongs to neither side. Under AI: the existing
// Research & Copy and Scripts tabs below, unchanged. Under Manual: the
// new phase-gated Research/Packaging/Scripting workflow
// (manual-workflow-panel.tsx). Same pill-toggle styling (solid/ghost
// Button swap) both levels already used, not the sliding-indicator style
// used for Publishing/Recording elsewhere on this app, per the spec's
// explicit visual reference.
//
// Phase A note: the old Manual paste-panel that already lives inside
// ResearchAndCopyTab/ScriptsTab (source==="manual") is untouched here,
// still reachable under AI exactly as before. The new Manual workflow is
// purely additive for now; removing the old one is a separate decision.
export function TopicPageTabs({
  contentId,
  briefIntent,
  keywords,
  researchCopyVersions,
  scriptsVersions,
  referenceVideos,
  manualWorkflowPhases,
}: {
  contentId: string;
  briefIntent: string | null;
  keywords: string | null;
  researchCopyVersions: ResearchCopyVersion[];
  scriptsVersions: ScriptsVersion[];
  referenceVideos: ReferenceVideo[];
  manualWorkflowPhases: ManualWorkflowPhaseRow[];
}) {
  const [area, setArea] = useState<Area>("ai");
  const [aiTab, setAiTab] = useState<AiTab>("research");
  // Section 7: Scripts' Run reads whichever research version is
  // currently active, "active" means what it says, full stop, not
  // always the AI one.
  const activeResearchCopy = researchCopyVersions.find((v) => v.is_live)?.data ?? null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-0.5 rounded-lg border border-border p-0.5">
          <Button
            type="button"
            size="sm"
            variant={area === "manual" ? "default" : "ghost"}
            onClick={() => setArea("manual")}
          >
            Manual
          </Button>
          <Button
            type="button"
            size="sm"
            variant={area === "ai" ? "default" : "ghost"}
            onClick={() => setArea("ai")}
          >
            AI
          </Button>
        </div>

        <div className="inline-flex items-center gap-0.5 rounded-lg border border-border p-0.5">
          <Button
            type="button"
            size="sm"
            variant={area === "videos" ? "default" : "ghost"}
            onClick={() => setArea("videos")}
          >
            Reference Videos
          </Button>
        </div>
      </div>

      {area === "ai" && (
        <div className="mt-4">
          <div className="inline-flex items-center gap-0.5 rounded-lg border border-border p-0.5">
            {(Object.keys(AI_TAB_LABELS) as AiTab[]).map((t) => (
              <Button
                key={t}
                type="button"
                size="sm"
                variant={aiTab === t ? "default" : "ghost"}
                onClick={() => setAiTab(t)}
              >
                {AI_TAB_LABELS[t]}
              </Button>
            ))}
          </div>

          <div className={aiTab === "research" ? "mt-4" : "mt-4 hidden"}>
            <ResearchAndCopyTab
              contentId={contentId}
              briefIntent={briefIntent}
              keywords={keywords}
              versions={researchCopyVersions}
            />
          </div>

          <div className={aiTab === "scripts" ? "mt-4" : "mt-4 hidden"}>
            <ScriptsTab
              contentId={contentId}
              activeResearchCopy={activeResearchCopy}
              versions={scriptsVersions}
            />
          </div>
        </div>
      )}

      {area === "manual" && (
        <div className="mt-4">
          <ManualWorkflowPanel contentId={contentId} phases={manualWorkflowPhases} />
        </div>
      )}

      {area === "videos" && (
        <div className="mt-4">
          <ReferenceVideosSection contentId={contentId} videos={referenceVideos} />
        </div>
      )}
    </div>
  );
}
