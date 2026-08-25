"use client";

import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/glow-card";
import type { ResearchCopyVersion, VersionSource } from "@/lib/types";
import { useResearchTitle } from "@/app/(app)/calendar/[id]/research-copy-actions";

const VERSION_LABELS: Record<VersionSource, string> = {
  manual: "Manual",
  ai: "AI Research",
};

// Description/Keyword tags/Question tags stay display-only here, no
// "Use This": their only destination was the Copy-Ready panel on the
// main content form, now removed as redundant (that same input lives
// in this Research/Packaging structure already). Titles keeps its
// "Use This" since final_title is still very much a live field.
function TagContainer({ label, tags }: { label: string; tags: string[] }) {
  return (
    <GlowCard glow={1} className="space-y-2 p-4" textHeavy>
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {tags.length === 0 ? (
          <p className="text-xs text-muted-foreground">None found.</p>
        ) : (
          tags.map((t, i) => (
            <span
              key={i}
              className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground"
            >
              {t}
            </span>
          ))
        )}
      </div>
    </GlowCard>
  );
}

// The Packaging-half of what used to be research-and-copy-tab.tsx's
// VersionPanel: titles, description, and keyword/question tags only,
// no Run/Paste/Go Deeper controls of its own (see
// ai-research-phase-content.tsx and ai-workflow-panel.tsx's comments on
// why: one atomic generation call produces both halves together, this
// phase is a read-only reorganized view of the same already-fetched
// data, not a second thing to generate). A quiet non-interactive
// "Active" note instead of the Research phase's own Active/Make active
// control, so it's still clear which version's titles are the ones
// feeding Scripts, without a second control mutating the same flag.
function PackagingVersionPanel({
  contentId,
  source,
  version,
}: {
  contentId: string;
  source: VersionSource;
  version: ResearchCopyVersion | undefined;
}) {
  const boundUseTitle = useResearchTitle.bind(null, contentId);
  const researchCopy = version?.data;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{VERSION_LABELS[source]}</p>
        {version?.is_live && (
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
            Active
          </span>
        )}
      </div>

      {!researchCopy ? (
        <p className="text-xs text-muted-foreground">
          {source === "manual" ? "Nothing pasted yet." : "Nothing run yet."}
        </p>
      ) : (
        <div className="space-y-3">
          <GlowCard glow={3} className="space-y-2 p-3.5" textHeavy>
            <p className="text-xs font-medium text-muted-foreground">Titles</p>
            <div className="space-y-2">
              {researchCopy.titles.map((t, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 rounded-md border border-border p-2"
                >
                  <p className="text-sm">{t}</p>
                  <form action={boundUseTitle}>
                    <input type="hidden" name="value" value={t} />
                    <Button type="submit" size="xs" variant="outline">
                      Use This
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          </GlowCard>

          <GlowCard glow={1} className="space-y-2 p-3.5" textHeavy>
            <p className="text-xs font-medium text-muted-foreground">Description</p>
            <p className="text-sm">{researchCopy.description}</p>
          </GlowCard>

          <div className="grid gap-3 sm:grid-cols-2">
            <TagContainer label="Keyword tags" tags={researchCopy.keywordTags} />
            <TagContainer label="Question tags" tags={researchCopy.questionTags} />
          </div>
        </div>
      )}
    </div>
  );
}

export function AiPackagingPhaseContent({
  contentId,
  versions,
}: {
  contentId: string;
  versions: ResearchCopyVersion[];
}) {
  const manual = versions.find((v) => v.source === "manual");
  const ai = versions.find((v) => v.source === "ai");

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">Packaging</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <PackagingVersionPanel contentId={contentId} source="manual" version={manual} />
        <PackagingVersionPanel contentId={contentId} source="ai" version={ai} />
      </div>
    </div>
  );
}
