"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ResearchAndCopyTab } from "@/components/research-and-copy-tab";
import { ScriptsTab } from "@/components/scripts-tab";
import { ReferenceVideosSection } from "@/components/reference-videos-section";
import type { ReferenceVideo, ResearchCopyVersion, ScriptsVersion } from "@/lib/types";

type Tab = "research" | "scripts" | "videos";

const TAB_LABELS: Record<Tab, string> = {
  research: "Research & Copy",
  scripts: "Scripts",
  videos: "Reference Videos",
};

// docs/topic-page-redesign.md Section 2 originally specified exactly two
// tabs; Reference Videos (Section 10.2.1) is a third, restored here after
// going silently unwired rather than ever being deliberately cut (unlike
// Competitor Benchmarks, which topic-page-redesign.md Section 9 records
// as an intentional removal). Same pill-toggle styling (solid/ghost
// Button swap) as the original two, not the sliding-indicator style used
// for Publishing/Recording elsewhere on this app, per the spec's explicit
// visual reference.
export function TopicPageTabs({
  contentId,
  briefIntent,
  keywords,
  researchCopyVersions,
  scriptsVersions,
  referenceVideos,
}: {
  contentId: string;
  briefIntent: string | null;
  keywords: string | null;
  researchCopyVersions: ResearchCopyVersion[];
  scriptsVersions: ScriptsVersion[];
  referenceVideos: ReferenceVideo[];
}) {
  const [tab, setTab] = useState<Tab>("research");
  // Section 7: Scripts' Run reads whichever research version is
  // currently active, "active" means what it says, full stop, not
  // always the AI one.
  const activeResearchCopy = researchCopyVersions.find((v) => v.is_live)?.data ?? null;

  return (
    <div>
      <div className="inline-flex items-center gap-0.5 rounded-lg border border-border p-0.5">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <Button
            key={t}
            type="button"
            size="sm"
            variant={tab === t ? "default" : "ghost"}
            onClick={() => setTab(t)}
          >
            {TAB_LABELS[t]}
          </Button>
        ))}
      </div>

      <div className={tab === "research" ? "mt-4" : "mt-4 hidden"}>
        <ResearchAndCopyTab
          contentId={contentId}
          briefIntent={briefIntent}
          keywords={keywords}
          versions={researchCopyVersions}
        />
      </div>

      <div className={tab === "scripts" ? "mt-4" : "mt-4 hidden"}>
        <ScriptsTab contentId={contentId} activeResearchCopy={activeResearchCopy} versions={scriptsVersions} />
      </div>

      <div className={tab === "videos" ? "mt-4" : "mt-4 hidden"}>
        <ReferenceVideosSection contentId={contentId} videos={referenceVideos} />
      </div>
    </div>
  );
}
