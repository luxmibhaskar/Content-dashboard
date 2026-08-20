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
import type {
  ResearchCopyContainer,
  ResearchCopyResult,
  ResearchProgress,
  ResearchSource,
  ResearchStep,
} from "@/lib/types";
import {
  runResearchAndCopy,
  getResearchProgress,
  updateResearchInput,
  useResearchTitle,
  useResearchDescription,
  useResearchKeywordTags,
  useResearchQuestionTags,
  importResearchCopyPaste,
  type RunResearchState,
} from "@/app/(app)/calendar/[id]/research-copy-actions";

const RESEARCH_PASTE_TEMPLATE_HINT = `Expects these headers, each on its own line, in this order:
SUMMARY / SOURCES / TITLES / DESCRIPTION / KEYWORD TAGS / QUESTION TAGS / SOURCE FINDINGS (optional).
Sources as "Title - https://...", one per line. Titles as a numbered or bulleted list.
Source findings as "### Source Name (Discussion)" or "### Source Name (Article)" blocks, each with
its own content and an optional "Links:" sub-list underneath (not "Sources:", that collides with the
top-level SOURCES header). See docs/topic-page-redesign.md Section 7.`;

const STEP_LABELS: Record<ResearchStep, string> = {
  summary: "Summary",
  sources: "Sources",
  copy: "Titles & Tags",
};

// Polled every 3s while Run is pending (see the effect below), a separate
// concurrent request from Run's own, so it can see progress checkpoints
// land in Supabase in real time even though Run itself is still one long
// blocking call. Real per-piece status instead of one opaque spinner.
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

function TagContainer({
  label,
  tags,
  contentId,
  kind,
}: {
  label: string;
  tags: string[];
  contentId: string;
  kind: "keyword" | "question";
}) {
  const action = kind === "keyword" ? useResearchKeywordTags : useResearchQuestionTags;
  const boundAction = action.bind(null, contentId, tags);
  return (
    <GlowCard glow={1} className="space-y-2 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{label}</p>
        <form action={boundAction}>
          <Button type="submit" size="xs" variant="outline">
            Use This
          </Button>
        </form>
      </div>
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

function SourceContainer({ container }: { container: ResearchCopyContainer }) {
  return (
    <GlowCard glow={2} className="space-y-3 p-4">
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

// docs/topic-page-redesign.md Section 2, Tab 1 "Research & Copy". One
// Run, full depth from the start, no separate shallow-then-deep step.
// The Brief Description/Keywords fields live here (not a full Creator
// Input section) since Run needs something to search against, and a
// re-run should be refinable without leaving the tab.
export function ResearchAndCopyTab({
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
  const boundUpdateInput = updateResearchInput.bind(null, contentId);
  const boundUseTitle = useResearchTitle.bind(null, contentId);
  const boundUseDescription = useResearchDescription.bind(null, contentId);
  const boundImportPaste = importResearchCopyPaste.bind(null, contentId);

  // useActionState instead of a plain bound action: this call can take
  // minutes (real web search) and can now time out client-side (see
  // src/lib/anthropic.ts), so Run needs its own precise pending state
  // and a place to show the resulting error inline rather than crashing
  // the page or leaving the button silently stuck.
  const initialRunState: RunResearchState = { error: null };
  const [runState, runAction, isRunPending] = useActionState(
    runResearchAndCopy.bind(null, contentId),
    initialRunState,
  );

  // Belt-and-suspenders against a double-fired Run: the button's own
  // `loading`/disabled state depends on React committing isRunPending
  // to the DOM, which isn't instant. A very fast second submit (or a
  // Strict-Mode-style dev double-invoke) can land before that commit.
  // Once a server action is in flight there's no way to cancel it
  // server-side, a duplicate here means real API cost, so this ref
  // check runs synchronously on the submit event itself, no render
  // cycle involved, and is reset only once the pending action settles.
  const isSubmittingRef = useRef(false);
  useEffect(() => {
    if (!isRunPending) {
      isSubmittingRef.current = false;
    }
  }, [isRunPending]);

  // Runs as its own request, independent of Run's, so it observes
  // research_progress checkpoints landing in Supabase in real time
  // instead of only finding out once Run's own promise finally resolves.
  const [progress, setProgress] = useState<ResearchProgress | null>(null);
  useEffect(() => {
    if (!isRunPending) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const next = await getResearchProgress(contentId);
        if (!cancelled) setProgress(next);
      } catch (err) {
        console.error("[research-and-copy] progress poll failed:", err);
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
      <GlowCard glow={1} className="space-y-3 p-4">
        {/* Two sibling forms, not nested, HTML doesn't allow nesting
            forms (same reasoning as the Use This actions further down):
            Save persists Brief Description/Keywords, Run kicks off the
            research pass, independent actions. */}
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
              {researchCopy ? "Run Again" : "Run"}
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

      {!researchCopy && (
        <p className="text-sm text-muted-foreground">
          No research yet. Fill in a Brief Description and Keywords above, then Run for a full
          research pass, one Run, full depth from the start.
        </p>
      )}

      {researchCopy && (
        <>
          <GlowCard glow={2} className="space-y-3 p-4">
            <p className="text-sm font-medium">Summary</p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{researchCopy.summary}</p>
          </GlowCard>

          <CollapsibleSection title={`Sources (${researchCopy.globalSources.length})`}>
            <SourceLinks sources={researchCopy.globalSources} />
          </CollapsibleSection>

          <GlowCard glow={3} className="space-y-3 p-4">
            <p className="text-sm font-medium">Titles</p>
            <div className="space-y-2">
              {researchCopy.titles.map((t, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-md border border-border p-2.5"
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

          <GlowCard glow={1} className="space-y-2 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Description</p>
              <form action={boundUseDescription}>
                <input type="hidden" name="value" value={researchCopy.description} />
                <Button type="submit" size="xs" variant="outline">
                  Use This
                </Button>
              </form>
            </div>
            <p className="text-sm">{researchCopy.description}</p>
          </GlowCard>

          <div className="grid gap-4 sm:grid-cols-2">
            <TagContainer
              label="Keyword tags"
              tags={researchCopy.keywordTags}
              contentId={contentId}
              kind="keyword"
            />
            <TagContainer
              label="Question tags"
              tags={researchCopy.questionTags}
              contentId={contentId}
              kind="question"
            />
          </div>

          {researchCopy.containers.length > 0 && (
            <div className="space-y-3">
              {researchCopy.containers.map((c, i) => (
                <SourceContainer key={i} container={c} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
