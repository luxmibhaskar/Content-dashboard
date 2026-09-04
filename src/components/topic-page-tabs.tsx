"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ManualWorkflowPanel } from "@/components/manual-workflow-panel";
import { AiWorkflowPanel } from "@/components/ai-workflow-panel";
import type {
  ContentNote,
  ManualWorkflowPhaseRow,
  ResearchCopyVersion,
  ScriptsVersion,
} from "@/lib/types";

type Area = "ai" | "manual";

// docs/manual-workflow-redesign.md: restructures the topic page's top
// level from the flat Research & Copy / Scripts / Reference Videos pill
// (docs/topic-page-redesign.md Section 2, as amended for Reference
// Videos) to a Manual/AI toggle. Reference Videos moved out again
// (topic page restructuring, 2026-08-27): it's always-visible now,
// inline in the main form area (format-platform-fields.tsx) rather than
// a third pill here, so this toggle is back to plain Manual/AI. Same
// pill-toggle styling (solid/ghost Button swap) both levels already
// used, not the sliding-indicator style used for Publishing/Recording
// elsewhere on this app, per the spec's explicit visual reference.
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
  brand,
  briefIntent,
  keywords,
  researchCopyVersions,
  scriptsVersions,
  manualWorkflowPhases,
  notes,
}: {
  contentId: string;
  brand: string;
  briefIntent: string | null;
  keywords: string | null;
  researchCopyVersions: ResearchCopyVersion[];
  scriptsVersions: ScriptsVersion[];
  manualWorkflowPhases: ManualWorkflowPhaseRow[];
  notes: ContentNote[];
}) {
  const [area, setArea] = useState<Area>("manual");

  return (
    <div>
      {/* Made more prominent (topic page restructuring, 2026-08-27):
          heavier border, a background tint, and a shadow so this reads
          as a real top-level switch rather than a subtle 1px pill,
          matching the visual weight of a page-level control. Kept one
          notch heavier than PhaseNav's own bump below it
          (manual-workflow-ui.tsx) to preserve the hierarchy: this picks
          the side, PhaseNav picks the phase within it. */}
      <div className="inline-flex items-center gap-1 rounded-xl border-2 border-border bg-muted/50 p-1 shadow-sm">
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

      {area === "ai" && (
        <div className="mt-4">
          <AiWorkflowPanel
            contentId={contentId}
            brand={brand}
            briefIntent={briefIntent}
            keywords={keywords}
            researchCopyVersions={researchCopyVersions}
            scriptsVersions={scriptsVersions}
            notes={notes}
          />
        </div>
      )}

      {area === "manual" && (
        <div className="mt-4">
          <ManualWorkflowPanel
            contentId={contentId}
            brand={brand}
            phases={manualWorkflowPhases}
            notes={notes}
          />
        </div>
      )}
    </div>
  );
}
