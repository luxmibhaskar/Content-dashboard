"use client";

import { GlowCard } from "@/components/glow-card";
import { CollapsibleSection } from "@/components/collapsible-section";
import { PasteImportSection } from "@/components/paste-import-section";
import { ScoreBadge, Field, ListField } from "@/components/manual-workflow-ui";
import {
  PACKAGING_PASTE_TEMPLATE_HINT,
  type PackagingPhaseData,
  type PackagingTitleOption,
  type ThumbnailSuggestion,
} from "@/lib/manual-workflow-parsing";
import { importPackagingPhase } from "@/app/(app)/calendar/[id]/manual-workflow-actions";

const PLATFORM_COPY_LABELS: Record<keyof PackagingPhaseData["platformCopy"], string> = {
  youtubeDescription: "YouTube Description",
  shortFormCaption: "Short-Form Caption",
  instagramCaption: "Instagram Caption",
  tiktokCaption: "TikTok Caption",
  youtubeShortsCaption: "YouTube Shorts Caption",
  xCaption: "X Caption",
  threadsCaption: "Threads Caption",
};

function TitleOptionCard({ option, index }: { option: PackagingTitleOption; index: number }) {
  return (
    <GlowCard neutral className="space-y-2 p-3.5" textHeavy>
      <p className="text-sm font-semibold">
        Title {index + 1}: {option.title}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Research support" value={option.researchSupport} />
        <Field label="Viewer problem addressed" value={option.viewerProblemAddressed} />
        <Field label="Promise made" value={option.promiseMade} />
        <Field label="Reason to click" value={option.reasonToClick} />
      </div>
      <Field label="Risk of misleading" value={option.riskOfMisleading} />
    </GlowCard>
  );
}

function ThumbnailCard({ thumbnail, index }: { thumbnail: ThumbnailSuggestion; index: number }) {
  return (
    <GlowCard neutral className="space-y-2 p-3.5" textHeavy>
      <p className="text-sm font-semibold">
        Thumbnail {index + 1}: {thumbnail.concept}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Main visual" value={thumbnail.mainVisual} />
        <Field label="Subject action or expression" value={thumbnail.subjectActionOrExpression} />
        <Field label="Thumbnail text" value={thumbnail.thumbnailText} />
        <Field label="Color direction" value={thumbnail.colorDirection} />
        <Field label="Emotional trigger" value={thumbnail.emotionalTrigger} />
        <Field label="Why it fits" value={thumbnail.whyItFits} />
      </div>
      <Field label="What to avoid" value={thumbnail.whatToAvoid} />
    </GlowCard>
  );
}

// docs/manual-workflow-redesign.md Phase C: full display of the
// Packaging phase's output (three titles, seven platform copy blocks,
// keywords/phrases, three thumbnails, three hook pairs, carousel
// evaluation, three CTAs, and the six "strongest X" recommendations),
// same grouping-into-the-template's-own-sections and plain-siblings-not-
// nested-GlowCards approach as research-phase-content.tsx. No status
// badge anywhere here: Packaging's own template has no approval field
// (see manual-workflow-actions.ts's importPackagingPhase comment).
export function PackagingPhaseContent({
  contentId,
  data,
  hasExistingImport,
}: {
  contentId: string;
  data: PackagingPhaseData | null;
  hasExistingImport: boolean;
}) {
  const boundImportAction = importPackagingPhase.bind(null, contentId);

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">Packaging</p>

      <PasteImportSection action={boundImportAction} templateHint={PACKAGING_PASTE_TEMPLATE_HINT} />
      {!data && !hasExistingImport && (
        <p className="text-sm text-muted-foreground">
          Nothing pasted yet. Run the Phase 2 prompt in your AI chat of choice once Research is
          approved, then paste the response above.
        </p>
      )}

      {data && (
        <div className="space-y-3">
          {data.titles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Titles ({data.titles.length})</p>
              <div className="space-y-2">
                {data.titles.map((t, i) => (
                  <TitleOptionCard key={i} option={t} index={i} />
                ))}
              </div>
            </div>
          )}

          <CollapsibleSection title="Copy-Ready Platform Versions" glow={1}>
            <div className="space-y-3">
              {(Object.keys(PLATFORM_COPY_LABELS) as (keyof PackagingPhaseData["platformCopy"])[]).map(
                (key) => (
                  <Field key={key} label={PLATFORM_COPY_LABELS[key]} value={data.platformCopy[key]} />
                ),
              )}
            </div>
          </CollapsibleSection>

          <GlowCard glow={2} className="space-y-3 p-3.5" textHeavy>
            <div className="grid gap-3 sm:grid-cols-2">
              <ListField label="Short Keywords" items={data.shortKeywords} />
              <ListField label="Search Phrases" items={data.searchPhrases} />
            </div>
          </GlowCard>

          {data.thumbnails.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Thumbnails ({data.thumbnails.length})
              </p>
              <div className="space-y-2">
                {data.thumbnails.map((t, i) => (
                  <ThumbnailCard key={i} thumbnail={t} index={i} />
                ))}
              </div>
            </div>
          )}

          <GlowCard glow={3} className="space-y-3 p-3.5" textHeavy>
            <p className="text-xs font-medium text-muted-foreground">Hooks</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <ListField label="Visual Hooks" items={data.visualHooks} />
              <ListField label="Textual Hooks" items={data.textualHooks} />
              <ListField label="Verbal Hooks" items={data.verbalHooks} />
            </div>
          </GlowCard>

          <GlowCard glow={1} className="space-y-3 p-3.5" textHeavy>
            <p className="text-xs font-medium text-muted-foreground">Carousel Evaluation</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Recommendation" value={data.carousel.recommendation} />
              <Field label="Best platform" value={data.carousel.bestPlatform} />
              <Field label="Recommended slide count" value={data.carousel.recommendedSlideCount} />
              <Field label="Best carousel angle" value={data.carousel.bestCarouselAngle} />
              <Field label="Design direction" value={data.carousel.designDirection} />
              <Field label="Color direction" value={data.carousel.colorDirection} />
              <Field label="Final-slide CTA" value={data.carousel.finalSlideCta} />
              <Field label="Viewer takeaway" value={data.carousel.viewerTakeaway} />
            </div>
            <Field label="Reason" value={data.carousel.reason} />
            <ListField label="Carousel title options" items={data.carousel.titleOptions} />
            <div className="border-t border-border pt-3">
              <ScoreBadge label="Suitability" value={data.carousel.suitabilityScore} />
            </div>
          </GlowCard>

          <GlowCard glow={2} className="space-y-3 p-3.5" textHeavy>
            <p className="text-xs font-medium text-muted-foreground">CTA Options</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Engagement CTA" value={data.ctaOptions.engagement} />
              <Field label="Save/share CTA" value={data.ctaOptions.saveShare} />
              <Field
                label="Follow/subscribe/resource/conversion CTA"
                value={data.ctaOptions.followSubscribeResourceConversion}
              />
            </div>
          </GlowCard>

          <GlowCard glow={3} className="space-y-3 p-3.5" textHeavy>
            <p className="text-xs font-medium text-muted-foreground">Recommendations</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Strongest title" value={data.recommendations.strongestTitle} />
              <Field label="Strongest visual hook" value={data.recommendations.strongestVisualHook} />
              <Field label="Strongest textual hook" value={data.recommendations.strongestTextualHook} />
              <Field label="Strongest verbal hook" value={data.recommendations.strongestVerbalHook} />
              <Field label="Strongest thumbnail" value={data.recommendations.strongestThumbnail} />
              <Field label="Strongest CTA" value={data.recommendations.strongestCta} />
            </div>
          </GlowCard>
        </div>
      )}
    </div>
  );
}
