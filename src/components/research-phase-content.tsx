"use client";

import { GlowCard } from "@/components/glow-card";
import { CollapsibleSection } from "@/components/collapsible-section";
import { PasteImportSection } from "@/components/paste-import-section";
import {
  StatusSelect,
  ScoreBadge,
  Field,
  ListField,
  MarkerText,
  countMarkers,
  MarkerCountBadge,
  EditableCard,
  type EditableFieldSpec,
} from "@/components/manual-workflow-ui";
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
  updateManualWorkflowPhaseData,
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

function OpportunityCard({
  opportunity,
  index,
  onSave,
}: {
  opportunity: ContentOpportunity;
  index: number;
  onSave: (updated: ContentOpportunity) => Promise<void>;
}) {
  // Scores are nested one level deeper (opportunity.scores.relevance,
  // not opportunity.relevance) - EditableCard's patch is flat, so this
  // is the one card that needs its own merge logic rather than a plain
  // {...opportunity, ...patch} spread.
  const fields: EditableFieldSpec[] = [
    { key: "viewerProblem", label: "Viewer problem", value: opportunity.viewerProblem },
    { key: "viewerDesire", label: "Viewer desire", value: opportunity.viewerDesire },
    { key: "unansweredQuestion", label: "Unanswered question", value: opportunity.unansweredQuestion },
    { key: "whatCompetitorsMissed", label: "What competitors missed", value: opportunity.whatCompetitorsMissed },
    { key: "evidenceSupporting", label: "Evidence supporting", value: opportunity.evidenceSupporting },
    { key: "missingExample", label: "Missing example", value: opportunity.missingExample },
    { key: "missingDemonstration", label: "Missing demonstration", value: opportunity.missingDemonstration },
    { key: "whyItProvidesValue", label: "Why it provides value", value: opportunity.whyItProvidesValue },
    { key: "riskOfBecomingGeneric", label: "Risk of becoming generic", value: opportunity.riskOfBecomingGeneric },
    { key: "relevance", label: "Relevance score", kind: "number", value: opportunity.scores.relevance },
    { key: "evidence", label: "Evidence score", kind: "number", value: opportunity.scores.evidence },
    { key: "novelty", label: "Novelty score", kind: "number", value: opportunity.scores.novelty },
    { key: "evergreen", label: "Evergreen value score", kind: "number", value: opportunity.scores.evergreen },
    {
      key: "visualPotential",
      label: "Visual potential score",
      kind: "number",
      value: opportunity.scores.visualPotential,
    },
  ];

  return (
    <GlowCard neutral className="space-y-3 p-3.5" textHeavy>
      <p className="flex items-center gap-2 text-sm font-semibold">
        <span>
          Opportunity {index + 1}: {opportunity.name}
        </span>
        <MarkerCountBadge count={countMarkers(opportunity)} />
      </p>
      <EditableCard
        fields={fields}
        onSave={async (patch) =>
          onSave({
            ...opportunity,
            viewerProblem: patch.viewerProblem as string,
            viewerDesire: patch.viewerDesire as string,
            unansweredQuestion: patch.unansweredQuestion as string,
            whatCompetitorsMissed: patch.whatCompetitorsMissed as string,
            evidenceSupporting: patch.evidenceSupporting as string,
            missingExample: patch.missingExample as string,
            missingDemonstration: patch.missingDemonstration as string,
            whyItProvidesValue: patch.whyItProvidesValue as string,
            riskOfBecomingGeneric: patch.riskOfBecomingGeneric as string,
            scores: {
              relevance: patch.relevance as number,
              evidence: patch.evidence as number,
              novelty: patch.novelty as number,
              evergreen: patch.evergreen as number,
              visualPotential: patch.visualPotential as number,
            },
          })
        }
      >
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
      </EditableCard>
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

function CompetitorProfileCard({
  profile,
  onSave,
}: {
  profile: CompetitorProfile;
  onSave: (updated: CompetitorProfile) => Promise<void>;
}) {
  const title = `Competitor ${profile.competitorNumber}: ${competitorHeading(profile)}`;
  const fields: EditableFieldSpec[] = [
    { key: "creator", label: "Creator or organization", value: profile.creator },
    { key: "platform", label: "Platform", value: profile.platform },
    { key: "title", label: "Title", value: profile.title },
    { key: "url", label: "URL", value: profile.url },
    { key: "publicationDate", label: "Publication date", value: profile.publicationDate },
    { key: "mainPromise", label: "Main promise", value: profile.mainPromise },
    { key: "mainArgument", label: "Main argument", value: profile.mainArgument },
    { key: "keyPointsCovered", label: "Key points covered", value: profile.keyPointsCovered },
    { key: "strengths", label: "Strengths", value: profile.strengths },
    { key: "weaknesses", label: "Weaknesses", value: profile.weaknesses },
    { key: "whatTheyMissed", label: "What they missed", value: profile.whatTheyMissed },
    { key: "whatWasOversimplified", label: "What was oversimplified", value: profile.whatWasOversimplified },
    { key: "whatEvidenceWasMissing", label: "What evidence was missing", value: profile.whatEvidenceWasMissing },
    {
      key: "whatViewersMayNotUnderstand",
      label: "What viewers may still not understand",
      value: profile.whatViewersMayNotUnderstand,
    },
  ];

  return (
    <CollapsibleSection
      title={title}
      titleSuffix={<MarkerCountBadge count={countMarkers(profile)} />}
      glow={2}
      neutral
    >
      <EditableCard
        fields={fields}
        onSave={async (patch) => onSave({ ...profile, ...(patch as unknown as CompetitorProfile) })}
      >
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
      </EditableCard>
    </CollapsibleSection>
  );
}

function SourceClaimRow({
  source,
  onSave,
}: {
  source: ResearchSourceClaim;
  onSave: (updated: ResearchSourceClaim) => Promise<void>;
}) {
  const fields: EditableFieldSpec[] = [
    { key: "sourceTitle", label: "Source title", value: source.sourceTitle },
    { key: "url", label: "URL", value: source.url },
    { key: "publicationDate", label: "Publication or update date", value: source.publicationDate },
    { key: "claimSupported", label: "Claim supported", value: source.claimSupported },
    { key: "confidence", label: "Confidence level", value: source.confidence },
  ];

  return (
    <div className="rounded-md border border-border p-2.5">
      <EditableCard
        fields={fields}
        onSave={async (patch) => onSave({ ...source, ...(patch as unknown as ResearchSourceClaim) })}
      >
        <div className="flex items-start justify-between gap-2">
          <a
            href={source.url || undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-primary hover:underline"
          >
            {source.sourceTitle}
          </a>
          <div className="flex shrink-0 items-center gap-1.5">
            <MarkerCountBadge count={countMarkers(source)} />
            <ConfidenceTag level={source.confidence} />
          </div>
        </div>
        {source.publicationDate && (
          <p className="mt-0.5 text-xs text-muted-foreground">{source.publicationDate}</p>
        )}
        {source.claimSupported && (
          <p className="mt-1 text-sm">
            <MarkerText text={source.claimSupported} />
          </p>
        )}
      </EditableCard>
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

  // Every section/card's onSave below builds the complete updated
  // ResearchPhaseData (cloning `data`, replacing just its own slice)
  // and calls this - the null guard lives here once rather than at
  // every call site, even though every call site below only exists
  // inside the `{data && (...)}` block anyway.
  async function saveData(updater: (d: ResearchPhaseData) => ResearchPhaseData) {
    if (!data) return;
    await updateManualWorkflowPhaseData(contentId, "research", updater(data));
  }

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
          <CollapsibleSection
            title="Topic & Audience Overview"
            titleSuffix={
              <MarkerCountBadge
                count={countMarkers({
                  topicDefinition: data.topicDefinition,
                  primaryPillarAndSubtopic: data.primaryPillarAndSubtopic,
                  mainAudienceProblem: data.mainAudienceProblem,
                  audienceDesire: data.audienceDesire,
                  audienceConfusion: data.audienceConfusion,
                  currentDevelopments: data.currentDevelopments,
                  importantFindings: data.importantFindings,
                })}
              />
            }
            glow={1}
          >
            <EditableCard
              fields={[
                { key: "topicDefinition", label: "Topic Definition", value: data.topicDefinition },
                {
                  key: "primaryPillarAndSubtopic",
                  label: "Primary Pillar and Subtopic",
                  value: data.primaryPillarAndSubtopic,
                },
                { key: "mainAudienceProblem", label: "Main Audience Problem", value: data.mainAudienceProblem },
                { key: "audienceDesire", label: "Audience Desire", value: data.audienceDesire },
                { key: "audienceConfusion", label: "Audience Confusion", value: data.audienceConfusion },
                { key: "currentDevelopments", label: "Current Developments", value: data.currentDevelopments },
                { key: "importantFindings", label: "Important Findings", value: data.importantFindings },
              ]}
              onSave={async (patch) => saveData((d) => ({ ...d, ...(patch as Partial<ResearchPhaseData>) }))}
            >
              <Field label="Topic Definition" value={data.topicDefinition} />
              <Field label="Primary Pillar and Subtopic" value={data.primaryPillarAndSubtopic} />
              <Field label="Main Audience Problem" value={data.mainAudienceProblem} />
              <Field label="Audience Desire" value={data.audienceDesire} />
              <Field label="Audience Confusion" value={data.audienceConfusion} />
              <Field label="Current Developments" value={data.currentDevelopments} />
              <Field label="Important Findings" value={data.importantFindings} />
            </EditableCard>
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
            titleSuffix={
              <MarkerCountBadge
                count={countMarkers({
                  competitorProfiles: data.competitorProfiles,
                  directCompetitorContent: data.directCompetitorContent,
                  relatedContent: data.relatedContent,
                  competitorStrengths: data.competitorStrengths,
                  competitorWeaknesses: data.competitorWeaknesses,
                  whatCompetitorsMissed: data.whatCompetitorsMissed,
                })}
              />
            }
            glow={2}
          >
            {(data.competitorProfiles ?? []).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Full Competitor Profiles ({data.competitorProfiles.length})
                </p>
                <div className="space-y-2">
                  {data.competitorProfiles.map((profile, i) => (
                    <CompetitorProfileCard
                      key={profile.competitorNumber}
                      profile={profile}
                      onSave={async (updated) =>
                        saveData((d) => ({
                          ...d,
                          competitorProfiles: d.competitorProfiles.map((p, idx) => (idx === i ? updated : p)),
                        }))
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            <EditableCard
              fields={[
                {
                  key: "directCompetitorContent",
                  label: "Direct Competitor Content",
                  value: data.directCompetitorContent,
                },
                { key: "relatedContent", label: "Related Content", value: data.relatedContent },
                { key: "competitorStrengths", label: "Competitor Strengths", value: data.competitorStrengths },
                { key: "competitorWeaknesses", label: "Competitor Weaknesses", value: data.competitorWeaknesses },
                { key: "whatCompetitorsMissed", label: "What Competitors Missed", value: data.whatCompetitorsMissed },
              ]}
              onSave={async (patch) => saveData((d) => ({ ...d, ...(patch as Partial<ResearchPhaseData>) }))}
            >
              <Field label="Direct Competitor Content" value={data.directCompetitorContent} />
              <Field label="Related Content" value={data.relatedContent} />
              <Field label="Competitor Strengths" value={data.competitorStrengths} />
              <Field label="Competitor Weaknesses" value={data.competitorWeaknesses} />
              <Field label="What Competitors Missed" value={data.whatCompetitorsMissed} />
            </EditableCard>
          </CollapsibleSection>

          <CollapsibleSection
            title="Audience Questions & Comments"
            titleSuffix={
              <MarkerCountBadge
                count={countMarkers({
                  frequentlyAskedQuestions: data.frequentlyAskedQuestions,
                  unansweredQuestions: data.unansweredQuestions,
                  viewerPainPoints: data.viewerPainPoints,
                  viewerObjections: data.viewerObjections,
                  viewerMisunderstandings: data.viewerMisunderstandings,
                  viewerRequests: data.viewerRequests,
                  viewerSuggestions: data.viewerSuggestions,
                })}
              />
            }
            glow={3}
          >
            <EditableCard
              fields={[
                {
                  key: "frequentlyAskedQuestions",
                  label: "Frequently Asked Questions",
                  kind: "list",
                  value: data.frequentlyAskedQuestions,
                },
                {
                  key: "unansweredQuestions",
                  label: "Unanswered Questions",
                  kind: "list",
                  value: data.unansweredQuestions,
                },
                { key: "viewerPainPoints", label: "Viewer Pain Points", kind: "list", value: data.viewerPainPoints },
                { key: "viewerObjections", label: "Viewer Objections", kind: "list", value: data.viewerObjections },
                {
                  key: "viewerMisunderstandings",
                  label: "Viewer Misunderstandings",
                  kind: "list",
                  value: data.viewerMisunderstandings,
                },
                { key: "viewerRequests", label: "Viewer Requests", kind: "list", value: data.viewerRequests },
                { key: "viewerSuggestions", label: "Viewer Suggestions", kind: "list", value: data.viewerSuggestions },
              ]}
              onSave={async (patch) => saveData((d) => ({ ...d, ...(patch as Partial<ResearchPhaseData>) }))}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <ListField label="Frequently Asked Questions" items={data.frequentlyAskedQuestions} />
                <ListField label="Unanswered Questions" items={data.unansweredQuestions} />
                <ListField label="Viewer Pain Points" items={data.viewerPainPoints} />
                <ListField label="Viewer Objections" items={data.viewerObjections} />
                <ListField label="Viewer Misunderstandings" items={data.viewerMisunderstandings} />
                <ListField label="Viewer Requests" items={data.viewerRequests} />
                <ListField label="Viewer Suggestions" items={data.viewerSuggestions} />
              </div>
            </EditableCard>
          </CollapsibleSection>

          <CollapsibleSection
            title={
              data.contentOpportunities.length > 0
                ? `Content Gap & Opportunities (${data.contentOpportunities.length})`
                : "Content Gap & Opportunities"
            }
            titleSuffix={
              <MarkerCountBadge
                count={countMarkers({
                  contentGapAnalysis: data.contentGapAnalysis,
                  contentOpportunities: data.contentOpportunities,
                  recommendedOpportunity: data.recommendedOpportunity,
                  viewerTransformationOrDesiredOutcome: data.viewerTransformationOrDesiredOutcome,
                })}
              />
            }
            glow={1}
          >
            {data.contentOpportunities.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Content Opportunities ({data.contentOpportunities.length})
                </p>
                <div className="space-y-2">
                  {data.contentOpportunities.map((opp, i) => (
                    <OpportunityCard
                      key={i}
                      opportunity={opp}
                      index={i}
                      onSave={async (updated) =>
                        saveData((d) => ({
                          ...d,
                          contentOpportunities: d.contentOpportunities.map((o, idx) => (idx === i ? updated : o)),
                        }))
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            <EditableCard
              fields={[
                { key: "contentGapAnalysis", label: "Content Gap Analysis", value: data.contentGapAnalysis },
                {
                  key: "recommendedOpportunity",
                  label: "Recommended Opportunity",
                  value: data.recommendedOpportunity,
                },
                {
                  key: "viewerTransformationOrDesiredOutcome",
                  label: "Viewer Transformation or Desired Outcome",
                  value: data.viewerTransformationOrDesiredOutcome,
                },
              ]}
              onSave={async (patch) => saveData((d) => ({ ...d, ...(patch as Partial<ResearchPhaseData>) }))}
            >
              <Field label="Content Gap Analysis" value={data.contentGapAnalysis} />
              <Field label="Recommended Opportunity" value={data.recommendedOpportunity} />
              <Field
                label="Viewer Transformation or Desired Outcome"
                value={data.viewerTransformationOrDesiredOutcome}
              />
            </EditableCard>
          </CollapsibleSection>

          <CollapsibleSection
            title={`Sources (${data.sources.length})`}
            titleSuffix={<MarkerCountBadge count={countMarkers(data.sources)} />}
            glow={2}
          >
            {data.sources.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sources listed.</p>
            ) : (
              <div className="space-y-2">
                {data.sources.map((source, i) => (
                  <SourceClaimRow
                    key={i}
                    source={source}
                    onSave={async (updated) =>
                      saveData((d) => ({
                        ...d,
                        sources: d.sources.map((s, idx) => (idx === i ? updated : s)),
                      }))
                    }
                  />
                ))}
              </div>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            title="Research Limitations & Status"
            titleSuffix={
              <MarkerCountBadge
                count={countMarkers({
                  researchLimitations: data.researchLimitations,
                  researchQualityStatusText: data.researchQualityStatusText,
                })}
              />
            }
            glow={3}
          >
            <EditableCard
              fields={[
                { key: "researchLimitations", label: "Research Limitations", value: data.researchLimitations },
                {
                  key: "researchQualityStatusText",
                  label: "Research Quality Status",
                  value: data.researchQualityStatusText,
                },
              ]}
              onSave={async (patch) => saveData((d) => ({ ...d, ...(patch as Partial<ResearchPhaseData>) }))}
            >
              <Field label="Research Limitations" value={data.researchLimitations} />
              <div>
                {/* The live status control is the one at the top of this
                    phase (StatusSelect above) - not duplicated here, this
                    is just the template's own raw status text for
                    reference. Editing it here only changes this raw text,
                    it does not re-derive or touch the separate status
                    column - same decoupling as the dropdown itself. */}
                <p className="text-xs font-medium text-muted-foreground">Research Quality Status</p>
                <p className="mt-0.5 text-sm leading-relaxed whitespace-pre-wrap">
                  <MarkerText text={data.researchQualityStatusText} />
                </p>
              </div>
            </EditableCard>
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
