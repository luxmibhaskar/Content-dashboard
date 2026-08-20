"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ResearchAndCopyTab } from "@/components/research-and-copy-tab";
import { ScriptsTab } from "@/components/scripts-tab";
import type { ResearchCopyVersion, ScriptsVersion } from "@/lib/types";

type Tab = "research" | "scripts";

const TAB_LABELS: Record<Tab, string> = {
  research: "Research & Copy",
  scripts: "Scripts",
};

// docs/topic-page-redesign.md Section 2: exactly two tabs, styled like
// the existing brand-switcher pill toggle (solid/ghost Button swap),
// not the sliding-indicator style used for Publishing/Recording
// elsewhere on this app, per the spec's explicit visual reference.
export function TopicPageTabs({
  contentId,
  briefIntent,
  keywords,
  researchCopyVersions,
  scriptsVersions,
  leadWithPaste = false,
}: {
  contentId: string;
  briefIntent: string | null;
  keywords: string | null;
  researchCopyVersions: ResearchCopyVersion[];
  scriptsVersions: ScriptsVersion[];
  // "+ New (Manual)" (src/app/(app)/calendar/new/page.tsx) lands here
  // straight after creation: Research & Copy's "Paste from AI chat"
  // opens expanded by default instead of Run being the only obvious
  // action, Run itself is untouched, still right there, still usable.
  leadWithPaste?: boolean;
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
          leadWithPaste={leadWithPaste}
        />
      </div>

      <div className={tab === "scripts" ? "mt-4" : "mt-4 hidden"}>
        <ScriptsTab contentId={contentId} activeResearchCopy={activeResearchCopy} versions={scriptsVersions} />
      </div>
    </div>
  );
}
