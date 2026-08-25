"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ReferenceVideosSection } from "@/components/reference-videos-section";
import { ManualWorkflowPanel } from "@/components/manual-workflow-panel";
import { AiWorkflowPanel } from "@/components/ai-workflow-panel";
import type {
  ManualWorkflowPhaseRow,
  ReferenceVideo,
  ResearchCopyVersion,
  ScriptsVersion,
} from "@/lib/types";

type Area = "ai" | "manual" | "videos";

// docs/manual-workflow-redesign.md: restructures the topic page's top
// level from the flat Research & Copy / Scripts / Reference Videos pill
// (docs/topic-page-redesign.md Section 2, as amended for Reference
// Videos) to a Manual/AI toggle plus Reference Videos alongside it,
// since Reference Videos belongs to neither side. Same pill-toggle
// styling (solid/ghost Button swap) both levels already used, not the
// sliding-indicator style used for Publishing/Recording elsewhere on
// this app, per the spec's explicit visual reference.
//
// Both Manual and AI now use the same three-phase Research/Packaging/
// Scripting structure (manual-workflow-panel.tsx / ai-workflow-panel.tsx):
// a later reorganization request applied Manual's phase-gated pattern to
// the AI side too, replacing the old flat "Research & Copy"/"Scripts"
// two-tab switcher this used to render directly. Purely a navigation
// reshuffle, same AI generation calls, same content, see
// ai-workflow-panel.tsx's own comment for the gating specifics.
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
          <AiWorkflowPanel
            contentId={contentId}
            briefIntent={briefIntent}
            keywords={keywords}
            researchCopyVersions={researchCopyVersions}
            scriptsVersions={scriptsVersions}
          />
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
