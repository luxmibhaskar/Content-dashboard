"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CollapsibleSection } from "@/components/collapsible-section";
import { GlowCard } from "@/components/glow-card";
import { PasteImportSection } from "@/components/paste-import-section";
import { Field } from "@/components/manual-workflow-ui";
import { RESEARCH_PASTE_TEMPLATE_HINT } from "@/lib/paste-import";
import type {
  ResearchCopyContainer,
  ResearchCopyVersion,
  ResearchProgress,
  ResearchSource,
  ResearchStep,
  VersionSource,
} from "@/lib/types";
import {
  runResearchAndCopy,
  deepenResearchFromManual,
  getResearchProgress,
  updateResearchInput,
  importResearchCopyPaste,
  setActiveResearchCopyVersion,
  type RunResearchState,
} from "@/app/(app)/calendar/[id]/research-copy-actions";

const STEP_LABELS: Record<ResearchStep, string> = {
  summary: "Summary",
  sources: "Sources",
  copy: "Titles & Tags",
};

const VERSION_LABELS: Record<VersionSource, string> = {
  manual: "Manual",
  ai: "AI Research",
};

// Same progress-polling display as before this reorg, still shared by
// both Run and Go Deeper below, still shows all three of the AI call's
// internal steps (including "Titles & Tags") even though this phase
// only displays the summary/sources half of what that call produces,
// the underlying call is one atomic pass either way (see
// ai-workflow-panel.tsx's own comment on why Packaging has no Run of
// its own).
function ProgressSteps({ progress }: { progress: ResearchProgress }) {
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      {(Object.keys(STEP_LABELS) as ResearchStep[]).map((step) => {
        const status = progress.steps[step];
        return (
          <span key={step} className="flex items-center gap-1.5">
            {status === "done" && <Check className="size-3.5 text-emerald-500" aria-hidden="true" />}
            {status === "running" && (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            )}
            {status === "error" && <X className="size-3.5 text-destructive" aria-hidden="true" />}
            {status === "pending" && <span className="size-1.5 rounded-full bg-muted-foreground/40" />}
            <span className={status === "done" ? "text-foreground" : undefined}>
              {STEP_LABELS[step]}
            </span>
          </span>
        );
      })}
    </div>
  );
}

function SourceLinks({ sources }: { sources: ResearchSource[] }) {
  if (sources.length === 0) {
    return <p className="text-xs text-muted-foreground">No sources listed.</p>;
  }
  return (
    <ul className="space-y-1">
      {sources.map((s, i) => (
        <li key={i}>
          <a
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            {s.title}
          </a>
        </li>
      ))}
    </ul>
  );
}

function SourceContainer({ container }: { container: ResearchCopyContainer }) {
  return (
    <GlowCard glow={2} className="space-y-3 p-4" textHeavy>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{container.sourceName}</p>
        <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {container.type === "discussion" ? "Discussion" : "Article"}
        </span>
      </div>

      {container.type === "discussion" && container.items && container.items.length > 0 && (
        <div className="divide-y divide-border">
          {container.items.map((item, i) => (
            <p key={i} className="py-2 text-sm first:pt-0 last:pb-0">
              {item}
            </p>
          ))}
        </div>
      )}

      {container.type === "article" && container.articleSummary && (
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{container.articleSummary}</p>
      )}

      <CollapsibleSection title={`Sources (${container.sources.length})`}>
        <SourceLinks sources={container.sources} />
      </CollapsibleSection>
    </GlowCard>
  );
}

// The Research-half of what used to be research-and-copy-tab.tsx's
// VersionPanel: summary, global sources, and per-source containers
// (competitor/discussion coverage) only, titles/description/tags moved
// to ai-packaging-phase-content.tsx's own version panel. Active/Make
// active and Go Deeper stay here rather than duplicated in Packaging
// too: this is the phase that actually runs the generation call, "Use
// This" title/description/tag actions in Packaging don't depend on
// which version is active, only Scripts' own Run does.
function ResearchVersionPanel({
  contentId,
  source,
  version,
}: {
  contentId: string;
  source: VersionSource;
  version: ResearchCopyVersion | undefined;
}) {
  const boundSetActive = setActiveResearchCopyVersion.bind(null, contentId, source);
  const researchCopy = version?.data;

  const initialDeepenState: RunResearchState = { error: null };
  const [deepenState, deepenAction, isDeepenPending] = useActionState(
    deepenResearchFromManual.bind(null, contentId),
    initialDeepenState,
  );
  const isDeepenSubmittingRef = useRef(false);
  useEffect(() => {
    if (!isDeepenPending) isDeepenSubmittingRef.current = false;
  }, [isDeepenPending]);

  const [deepenProgress, setDeepenProgress] = useState<ResearchProgress | null>(null);
  useEffect(() => {
    if (!isDeepenPending) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const next = await getResearchProgress(contentId);
        if (!cancelled) setDeepenProgress(next);
      } catch (err) {
        console.error("[ai-research-phase] deepen progress poll failed:", err);
      }
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isDeepenPending, contentId]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{VERSION_LABELS[source]}</p>
        {version &&
          (version.is_live ? (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
              Active
            </span>
          ) : (
            <form action={boundSetActive}>
              <Button type="submit" size="xs" variant="ghost">
                Make active
              </Button>
            </form>
          ))}
      </div>

      {!researchCopy ? (
        <p className="text-xs text-muted-foreground">
          {source === "manual" ? "Nothing pasted yet." : "Nothing run yet."}
        </p>
      ) : (
        <div className="space-y-3">
          {source === "manual" && (
            <div className="space-y-2">
              <form
                action={deepenAction}
                onSubmit={(e) => {
                  if (isDeepenSubmittingRef.current) {
                    e.preventDefault();
                    return;
                  }
                  isDeepenSubmittingRef.current = true;
                }}
              >
                <Button type="submit" size="sm" variant="outline" loading={isDeepenPending}>
                  Go Deeper (AI Research)
                </Button>
              </form>
              {isDeepenPending && deepenProgress && <ProgressSteps progress={deepenProgress} />}
              {deepenState.error && (
                <p className="text-sm text-destructive" role="alert">
                  {deepenState.error}
                </p>
              )}
            </div>
          )}

          <GlowCard glow={2} className="space-y-2 p-3.5" textHeavy>
            <Field label="Summary" value={researchCopy.summary} />
          </GlowCard>

          <CollapsibleSection title={`Sources (${researchCopy.globalSources.length})`} glow={1}>
            <SourceLinks sources={researchCopy.globalSources} />
          </CollapsibleSection>

          {researchCopy.containers.length > 0 && (
            <div className="space-y-3">
              {researchCopy.containers.map((c, i) => (
                <SourceContainer key={i} container={c} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// AI side's Research phase (see docs/manual-workflow-redesign.md's
// three-phase structure, now applied to the AI side too per the
// reorganization this component is part of): the Brief Description/
// Keywords input, Run/Run Again, and Paste from AI chat all live here
// since this is the AI call's actual entry point, same generation call
// as before this reorg (synthesizeResearchAndCopy), just no longer
// sharing one flat tab with the titles/tags half of its own output.
export function AiResearchPhaseContent({
  contentId,
  briefIntent,
  keywords,
  versions,
}: {
  contentId: string;
  briefIntent: string | null;
  keywords: string | null;
  versions: ResearchCopyVersion[];
}) {
  const manual = versions.find((v) => v.source === "manual");
  const ai = versions.find((v) => v.source === "ai");

  const boundUpdateInput = updateResearchInput.bind(null, contentId);
  const boundImportPaste = importResearchCopyPaste.bind(null, contentId);

  const initialRunState: RunResearchState = { error: null };
  const [runState, runAction, isRunPending] = useActionState(
    runResearchAndCopy.bind(null, contentId),
    initialRunState,
  );

  const isSubmittingRef = useRef(false);
  useEffect(() => {
    if (!isRunPending) {
      isSubmittingRef.current = false;
    }
  }, [isRunPending]);

  const [progress, setProgress] = useState<ResearchProgress | null>(null);
  useEffect(() => {
    if (!isRunPending) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const next = await getResearchProgress(contentId);
        if (!cancelled) setProgress(next);
      } catch (err) {
        console.error("[ai-research-phase] progress poll failed:", err);
      }
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isRunPending, contentId]);

  return (
    <div className="space-y-5">
      <GlowCard glow={1} className="space-y-3 p-4" textHeavy>
        <form id="research-input-form" action={boundUpdateInput} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="brief_intent">Brief Description</Label>
            <Textarea id="brief_intent" name="brief_intent" defaultValue={briefIntent ?? ""} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="raw_keywords_topics">Keywords</Label>
            <Input id="raw_keywords_topics" name="raw_keywords_topics" defaultValue={keywords ?? ""} />
          </div>
        </form>
        <div className="flex items-center justify-between gap-2">
          <Button type="submit" form="research-input-form" size="sm" variant="outline">
            Save
          </Button>
          <form
            action={runAction}
            onSubmit={(e) => {
              if (isSubmittingRef.current) {
                e.preventDefault();
                return;
              }
              isSubmittingRef.current = true;
            }}
          >
            <Button type="submit" loading={isRunPending}>
              {ai ? "Run Again" : "Run"}
            </Button>
          </form>
        </div>
        {isRunPending && progress && <ProgressSteps progress={progress} />}
        {runState.error && (
          <p className="text-sm text-destructive" role="alert">
            {runState.error}
          </p>
        )}
        <PasteImportSection action={boundImportPaste} templateHint={RESEARCH_PASTE_TEMPLATE_HINT} />
      </GlowCard>

      {!manual && !ai ? (
        <p className="text-sm text-muted-foreground">
          No research yet. Fill in a Brief Description and Keywords above, then Run for a full
          research pass, or paste one in above, one Run or Paste, full depth either way.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <ResearchVersionPanel contentId={contentId} source="manual" version={manual} />
          <ResearchVersionPanel contentId={contentId} source="ai" version={ai} />
        </div>
      )}
    </div>
  );
}
