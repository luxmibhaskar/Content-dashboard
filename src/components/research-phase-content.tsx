"use client";

import { GlowCard } from "@/components/glow-card";
import { CollapsibleSection } from "@/components/collapsible-section";
import { PasteImportSection } from "@/components/paste-import-section";
import {
  RESEARCH_PHASE_PASTE_TEMPLATE_HINT,
  type ContentOpportunity,
  type ResearchPhaseData,
  type ResearchSourceClaim,
} from "@/lib/manual-workflow-parsing";
import { importResearchPhase } from "@/app/(app)/calendar/[id]/manual-workflow-actions";
import type { ManualWorkflowStatus } from "@/lib/types";

const STATUS_LABELS: Record<ManualWorkflowStatus, string> = {
  approved: "Approved",
  needs_revision: "Needs Revision",
  rejected: "Rejected",
};

const STATUS_CLASSES: Record<ManualWorkflowStatus, string> = {
  approved: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  needs_revision: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  rejected: "bg-destructive/15 text-destructive",
};

function StatusBadge({ status }: { status: ManualWorkflowStatus | null }) {
  if (!status) {
    return (
      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
        Not yet rated
      </span>
    );
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_CLASSES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

const CONFIDENCE_CLASSES: Record<string, string> = {
  high: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  low: "bg-destructive/15 text-destructive",
};

function ConfidenceTag({ level }: { level: string }) {
  const cls = CONFIDENCE_CLASSES[level.toLowerCase()] ?? "bg-muted text-muted-foreground";
  return <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>{level}</span>;
}

// 0-10 scores, per docs/manual-workflow-redesign.md's "render as small
// visible bars or badges, not plain numbers in a paragraph": a filled
// bar reads at a glance, and doubles as a color cue (low scores read
// visibly weaker, not just numerically) without needing five separate
// colors to memorize.
function ScoreBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.max(0, Math.min(10, value)) * 10}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-xs font-medium">{value}/10</span>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm leading-relaxed whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function ListField({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {items.length === 0 ? (
        <p className="mt-0.5 text-sm text-muted-foreground">None found.</p>
      ) : (
        <ul className="mt-1 list-disc space-y-1 pl-4">
          {items.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OpportunityCard({ opportunity, index }: { opportunity: ContentOpportunity; index: number }) {
  return (
    <GlowCard neutral className="space-y-3 p-3.5" textHeavy>
      <p className="text-sm font-semibold">
        Opportunity {index + 1}: {opportunity.name}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Viewer problem" value={opportunity.viewerProblem} />
        <Field label="Viewer desire" value={opportunity.viewerDesire} />
        <Field label="Unanswered question" value={opportunity.unansweredQuestion} />
        <Field label="What competitors missed" value={opportunity.whatCompetitorsMissed} />
        <Field label="Evidence supporting" value={opportunity.evidenceSupporting} />
        <Field label="Missing example" value={opportunity.missingExample} />
        <Field label="Missing demonstration" value={opportunity.missingDemonstration} />
        <Field label="Why it provides value" value={opportunity.whyItProvidesValue} />
      </div>
      <Field label="Risk of becoming generic" value={opportunity.riskOfBecomingGeneric} />
      <div className="space-y-1.5 border-t border-border pt-3">
        <ScoreBadge label="Relevance" value={opportunity.scores.relevance} />
        <ScoreBadge label="Evidence" value={opportunity.scores.evidence} />
        <ScoreBadge label="Novelty" value={opportunity.scores.novelty} />
        <ScoreBadge label="Evergreen value" value={opportunity.scores.evergreen} />
        <ScoreBadge label="Visual potential" value={opportunity.scores.visualPotential} />
      </div>
    </GlowCard>
  );
}

function SourceClaimRow({ source }: { source: ResearchSourceClaim }) {
  return (
    <div className="rounded-md border border-border p-2.5">
      <div className="flex items-start justify-between gap-2">
        <a
          href={source.url || undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-primary hover:underline"
        >
          {source.sourceTitle}
        </a>
        <ConfidenceTag level={source.confidence} />
      </div>
      {source.publicationDate && (
        <p className="mt-0.5 text-xs text-muted-foreground">{source.publicationDate}</p>
      )}
      {source.claimSupported && <p className="mt-1 text-sm">{source.claimSupported}</p>}
    </div>
  );
}

// docs/manual-workflow-redesign.md Phase B: full display of the
// Research phase's 26-field output, grouped into the template's own
// natural sections (topic/audience, competitor research, audience
// Q&A, content gap + opportunities, sources/limitations/status) rather
// than 26 flat fields in a row. neutral where a sub-card doesn't
// represent this item's own pillar (opportunities, source claims), plain
// GlowCards elsewhere are siblings of the scroll container, not nested
// inside another glow-card, so no glow-in-glow.
export function ResearchPhaseContent({
  contentId,
  data,
  status,
  hasExistingImport,
}: {
  contentId: string;
  data: ResearchPhaseData | null;
  status: ManualWorkflowStatus | null;
  hasExistingImport: boolean;
}) {
  const boundImportAction = importResearchPhase.bind(null, contentId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Research</p>
        {hasExistingImport && <StatusBadge status={status} />}
      </div>

      <PasteImportSection action={boundImportAction} templateHint={RESEARCH_PHASE_PASTE_TEMPLATE_HINT} />
      {!data && !hasExistingImport && (
        <p className="text-sm text-muted-foreground">
          Nothing pasted yet. Run the Phase 1 prompt in your AI chat of choice, then paste the response
          above.
        </p>
      )}

      {data && (
        <div className="space-y-3">
          <GlowCard glow={1} className="space-y-3 p-3.5" textHeavy>
            <Field label="Topic Definition" value={data.topicDefinition} />
            <Field label="Primary Pillar and Subtopic" value={data.primaryPillarAndSubtopic} />
            <Field label="Main Audience Problem" value={data.mainAudienceProblem} />
            <Field label="Audience Desire" value={data.audienceDesire} />
            <Field label="Audience Confusion" value={data.audienceConfusion} />
            <Field label="Current Developments" value={data.currentDevelopments} />
            <Field label="Important Findings" value={data.importantFindings} />
          </GlowCard>

          <GlowCard glow={2} className="space-y-3 p-3.5" textHeavy>
            <p className="text-xs font-medium text-muted-foreground">Competitor Research</p>
            <Field label="Direct Competitor Content" value={data.directCompetitorContent} />
            <Field label="Related Content" value={data.relatedContent} />
            <Field label="Competitor Strengths" value={data.competitorStrengths} />
            <Field label="Competitor Weaknesses" value={data.competitorWeaknesses} />
            <Field label="What Competitors Missed" value={data.whatCompetitorsMissed} />
          </GlowCard>

          <GlowCard glow={3} className="space-y-3 p-3.5" textHeavy>
            <p className="text-xs font-medium text-muted-foreground">Audience Questions &amp; Comments</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <ListField label="Frequently Asked Questions" items={data.frequentlyAskedQuestions} />
              <ListField label="Unanswered Questions" items={data.unansweredQuestions} />
              <ListField label="Viewer Pain Points" items={data.viewerPainPoints} />
              <ListField label="Viewer Objections" items={data.viewerObjections} />
              <ListField label="Viewer Misunderstandings" items={data.viewerMisunderstandings} />
              <ListField label="Viewer Requests" items={data.viewerRequests} />
              <ListField label="Viewer Suggestions" items={data.viewerSuggestions} />
            </div>
          </GlowCard>

          <GlowCard glow={1} className="space-y-3 p-3.5" textHeavy>
            <Field label="Content Gap Analysis" value={data.contentGapAnalysis} />

            {data.contentOpportunities.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Content Opportunities ({data.contentOpportunities.length})
                </p>
                <div className="space-y-2">
                  {data.contentOpportunities.map((opp, i) => (
                    <OpportunityCard key={i} opportunity={opp} index={i} />
                  ))}
                </div>
              </div>
            )}

            <Field label="Recommended Opportunity" value={data.recommendedOpportunity} />
            <Field
              label="Viewer Transformation or Desired Outcome"
              value={data.viewerTransformationOrDesiredOutcome}
            />
          </GlowCard>

          <CollapsibleSection title={`Sources (${data.sources.length})`} glow={2}>
            {data.sources.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sources listed.</p>
            ) : (
              <div className="space-y-2">
                {data.sources.map((source, i) => (
                  <SourceClaimRow key={i} source={source} />
                ))}
              </div>
            )}
          </CollapsibleSection>

          <GlowCard glow={3} className="space-y-3 p-3.5" textHeavy>
            <Field label="Research Limitations" value={data.researchLimitations} />
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Research Quality Status</p>
                <StatusBadge status={status} />
              </div>
              <p className="mt-0.5 text-sm leading-relaxed whitespace-pre-wrap">
                {data.researchQualityStatusText}
              </p>
            </div>
          </GlowCard>
        </div>
      )}
    </div>
  );
}
