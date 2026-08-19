"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ResearchAndCopyTab } from "@/components/research-and-copy-tab";
import type { ResearchCopyResult } from "@/lib/types";

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
  researchCopy,
}: {
  contentId: string;
  briefIntent: string | null;
  keywords: string | null;
  researchCopy: ResearchCopyResult | null;
}) {
  const [tab, setTab] = useState<Tab>("research");

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
          researchCopy={researchCopy}
        />
      </div>

      <div className={tab === "scripts" ? "mt-4" : "mt-4 hidden"}>
        <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
          Scripts tab is next up, not built yet.
        </div>
      </div>
    </div>
  );
}
