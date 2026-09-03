"use client";

import { GlowCard } from "@/components/glow-card";
import { CollapsibleSection } from "@/components/collapsible-section";
import { PasteImportSection } from "@/components/paste-import-section";
import { StatusSelect, ScoreBadge, Field, ListField, MarkerText } from "@/components/manual-workflow-ui";
import {
  RESEARCH_PHASE_PASTE_TEMPLATE_HINT,
  type CompetitorProfile,
  type ContentOpportunity,
  type ResearchPhaseData,
  type ResearchSourceClaim,
} from "@/lib/manual-workflow-parsing";
import {
  importResearchPhase,
  updateManualWorkflowPhaseStatus,
} from "@/app/(app)/calendar/[id]/manual-workflow-actions";
import type { ManualWorkflowStatus } from "@/lib/types";

// Confidence tags are Research-specific (per-source-claim confidence
// level, nothing else in this template has an equivalent), kept local
// rather than added to manual-workflow-ui.tsx's shared set.
const CONFIDENCE_CLASSES: Record<string, string> = {
  high: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  low: "bg-destructive/15 text-destructive",
};

function ConfidenceTag({ level }: { level: string }) {
  const cls = CONFIDENCE_CLASSES[level.toLowerCase()] ?? "bg-muted text-muted-foreground";
  return <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>{level}</span>;
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

// Full per-competitor detail from the narrative preamble's COMPETITOR
// RESEARCH section (manual-workflow-parsing.ts's competitorProfiles) -
// distinct from, and additional to, this file's existing compact
// Direct Competitor Content / Competitor Strengths / etc. fields below,
// which stay exactly as they were. Collapsed by default via the same
// CollapsibleSection used for Sources and the Original-pasted-text
// viewer elsewhere on this page, since several of these stacked open
// would be as much text as the raw paste itself.
function competitorHeading(profile: CompetitorProfile): string {
  const heading = (profile.title || profile.creator || `Competitor ${profile.competitorNumber}`).trim();
  // A real Title is normally short, but the template also allows
  // "Format" as a stand-in when a competitor entry is a general content
  // pattern rather than one piece of content (e.g. "process reveals
  // like 'it starts with a single eRank search,' often tied to selling
  // a paid guide..."), which reads as a full sentence, not a title. This
  // keeps the collapsed row one line regardless of which case it is.
  return heading.length > 90 ? `${heading.slice(0, 87).trimEnd()}…` : heading;
}

function CompetitorProfileCard({ profile }: { profile: CompetitorProfile }) {
  const title = `Competitor ${profile.competitorNumber}: ${competitorHeading(profile)}`;
  return (
    <CollapsibleSection title={title} glow={2} neutral>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Creator or organization" value={profile.creator} />
        <Field label="Platform" value={profile.platform} />
        <Field label="Title" value={profile.title} />
        <Field label="Publication date" value={profile.publicationDate} />
      </div>
      {profile.url && (
        <a
          href={profile.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-sm text-primary hover:underline"
        >
          {profile.url}
        </a>
      )}
      <Field label="Main promise" value={profile.mainPromise} />
      <Field label="Main argument" value={profile.mainArgument} />
      <Field label="Key points covered" value={profile.keyPointsCovered} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Strengths" value={profile.strengths} />
        <Field label="Weaknesses" value={profile.weaknesses} />
      </div>
      <Field label="What they missed" value={profile.whatTheyMissed} />
      <Field label="What was oversimplified" value={profile.whatWasOversimplified} />
      <Field label="What evidence was missing" value={profile.whatEvidenceWasMissing} />
      <Field label="What viewers may still not understand" value={profile.whatViewersMayNotUnderstand} />
    </CollapsibleSection>
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
      {source.claimSupported && (
        <p className="mt-1 text-sm">
          <MarkerText text={source.claimSupported} />
        </p>
      )}
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
  rawPastedText,
}: {
  contentId: string;
  data: ResearchPhaseData | null;
  status: ManualWorkflowStatus | null;
  hasExistingImport: boolean;
  // The exact text last pasted into this phase, saved regardless of
  // parse success (manual-workflow-actions.ts). RESEARCH_PHASE_HEADERS
  // only recognizes the template's final 26-item RESEARCH OUTPUT list,
  // so a research skill's narrative write-up ahead of that list (e.g.
  // "What is happening around this topic," full competitor profiles,
  // raw audience comments) never reaches `data` - this is the only
  // place that content is still visible, not silently discarded.
  rawPastedText: string | null;
}) {
  const boundImportAction = importResearchPhase.bind(null, contentId);
  const boundStatusAction = updateManualWorkflowPhaseStatus.bind(null, contentId, "research");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Research</p>
        {hasExistingImport && <StatusSelect status={status} action={boundStatusAction} />}
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
          <CollapsibleSection title="Topic & Audience Overview" glow={1}>
            <Field label="Topic Definition" value={data.topicDefinition} />
            <Field label="Primary Pillar and Subtopic" value={data.primaryPillarAndSubtopic} />
            <Field label="Main Audience Problem" value={data.mainAudienceProblem} />
            <Field label="Audience Desire" value={data.audienceDesire} />
            <Field label="Audience Confusion" value={data.audienceConfusion} />
            <Field label="Current Developments" value={data.currentDevelopments} />
            <Field label="Important Findings" value={data.importantFindings} />
          </CollapsibleSection>

          <CollapsibleSection
            title={
              // competitorProfiles was added to ResearchPhaseData after this
              // app already had live rows in manual_workflow_phases -
              // parsed_data is untyped JSONB, so a row saved before this
              // field existed genuinely has no such key at runtime despite
              // the `as ResearchPhaseData` cast upstream, ?? [] rather than
              // data.competitorProfiles.length crashing the whole page on
              // that older data.
              (data.competitorProfiles ?? []).length > 0
                ? `Competitor Research (${data.competitorProfiles.length} profiles)`
                : "Competitor Research"
            }
            glow={2}
          >
            {(data.competitorProfiles ?? []).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Full Competitor Profiles ({data.competitorProfiles.length})
                </p>
                <div className="space-y-2">
                  {data.competitorProfiles.map((profile) => (
                    <CompetitorProfileCard key={profile.competitorNumber} profile={profile} />
                  ))}
                </div>
              </div>
            )}

            <Field label="Direct Competitor Content" value={data.directCompetitorContent} />
            <Field label="Related Content" value={data.relatedContent} />
            <Field label="Competitor Strengths" value={data.competitorStrengths} />
            <Field label="Competitor Weaknesses" value={data.competitorWeaknesses} />
            <Field label="What Competitors Missed" value={data.whatCompetitorsMissed} />
          </CollapsibleSection>

          <CollapsibleSection title="Audience Questions & Comments" glow={3}>
            <div className="grid gap-3 sm:grid-cols-2">
              <ListField label="Frequently Asked Questions" items={data.frequentlyAskedQuestions} />
              <ListField label="Unanswered Questions" items={data.unansweredQuestions} />
              <ListField label="Viewer Pain Points" items={data.viewerPainPoints} />
              <ListField label="Viewer Objections" items={data.viewerObjections} />
              <ListField label="Viewer Misunderstandings" items={data.viewerMisunderstandings} />
              <ListField label="Viewer Requests" items={data.viewerRequests} />
              <ListField label="Viewer Suggestions" items={data.viewerSuggestions} />
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title={
              data.contentOpportunities.length > 0
                ? `Content Gap & Opportunities (${data.contentOpportunities.length})`
                : "Content Gap & Opportunities"
            }
            glow={1}
          >
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
          </CollapsibleSection>

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

          <CollapsibleSection title="Research Limitations & Status" glow={3}>
            <Field label="Research Limitations" value={data.researchLimitations} />
            <div>
              {/* The live status control is the one at the top of this
                  phase (StatusSelect above) - not duplicated here, this
                  is just the template's own raw status text for
                  reference. */}
              <p className="text-xs font-medium text-muted-foreground">Research Quality Status</p>
              <p className="mt-0.5 text-sm leading-relaxed whitespace-pre-wrap">
                <MarkerText text={data.researchQualityStatusText} />
              </p>
            </div>
          </CollapsibleSection>

          {rawPastedText && (
            <CollapsibleSection title="Original pasted text" glow={3} neutral>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                <MarkerText text={rawPastedText} />
              </p>
            </CollapsibleSection>
          )}
        </div>
      )}
    </div>
  );
}
