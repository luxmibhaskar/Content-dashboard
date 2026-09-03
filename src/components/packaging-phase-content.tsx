"use client";

import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/glow-card";
import { CollapsibleSection } from "@/components/collapsible-section";
import { PasteImportSection } from "@/components/paste-import-section";
import { ScoreBadge, Field, ListField, StatusSelect } from "@/components/manual-workflow-ui";
import {
  PACKAGING_PASTE_TEMPLATE_HINT,
  type PackagingPhaseData,
  type PackagingTitleOption,
  type ThumbnailSuggestion,
} from "@/lib/manual-workflow-parsing";
import {
  importPackagingPhase,
  updateManualWorkflowPhaseStatus,
} from "@/app/(app)/calendar/[id]/manual-workflow-actions";
import { useResearchTitle } from "@/app/(app)/calendar/[id]/research-copy-actions";
import { useHook } from "@/app/(app)/calendar/[id]/hook-actions";
import type { HookLibraryType, ManualWorkflowStatus } from "@/lib/types";

const PLATFORM_COPY_LABELS: Record<keyof PackagingPhaseData["platformCopy"], string> = {
  youtubeDescription: "YouTube Description",
  shortFormCaption: "Short-Form Caption",
  instagramCaption: "Instagram Caption",
  tiktokCaption: "TikTok Caption",
  youtubeShortsCaption: "YouTube Shorts Caption",
  xCaption: "X Caption",
  threadsCaption: "Threads Caption",
};

function TitleOptionCard({
  option,
  index,
  boundUseTitle,
}: {
  option: PackagingTitleOption;
  index: number;
  boundUseTitle: (formData: FormData) => Promise<void>;
}) {
  return (
    <GlowCard neutral className="space-y-2 p-3.5" textHeavy>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold">
          Title {index + 1}: {option.title}
        </p>
        <form action={boundUseTitle}>
          <input type="hidden" name="value" value={option.title} />
          <Button type="submit" size="xs" variant="outline" className="shrink-0">
            Use
          </Button>
        </form>
      </div>
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

// docs/platform-performance-tracking.md Section 7: each hook gets a
// "Use" action, same visual pattern as the AI side's Titles "Use This"
// (ai-packaging-phase-content.tsx) - a tiny per-item form, not a bulk
// action, so using one hook doesn't require touching the others.
function HookListField({
  label,
  items,
  boundUse,
}: {
  label: string;
  items: string[];
  boundUse: (formData: FormData) => Promise<void>;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {items.length === 0 ? (
        <p className="mt-0.5 text-sm text-muted-foreground">None found.</p>
      ) : (
        <div className="mt-1 space-y-1.5">
          {items.map((item, i) => (
            <div key={i} className="flex items-start justify-between gap-2 rounded-md border border-border p-2">
              <p className="text-sm leading-relaxed">{item}</p>
              <form action={boundUse}>
                <input type="hidden" name="value" value={item} />
                <Button type="submit" size="xs" variant="outline" className="shrink-0">
                  Use
                </Button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
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
// nested-GlowCards approach as research-phase-content.tsx. Packaging's
// own template has no approval field (unlike Research/Scripting, no
// APPROVED/NEEDS REVISION line ever gets parsed here), but the status
// column itself is shared across all three phases, so it can still be
// set manually via StatusSelect - see updateManualWorkflowPhaseStatus's
// comment for why importPackagingPhase's own upsert leaves it alone.
export function PackagingPhaseContent({
  contentId,
  brand,
  data,
  status,
  hasExistingImport,
}: {
  contentId: string;
  brand: string;
  data: PackagingPhaseData | null;
  status: ManualWorkflowStatus | null;
  hasExistingImport: boolean;
}) {
  const boundImportAction = importPackagingPhase.bind(null, contentId);
  const boundStatusAction = updateManualWorkflowPhaseStatus.bind(null, contentId, "packaging");
  const boundUseTitle = useResearchTitle.bind(null, contentId);
  const boundUseHook = (type: HookLibraryType) => useHook.bind(null, contentId, brand, type);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Packaging</p>
        {hasExistingImport && <StatusSelect status={status} action={boundStatusAction} />}
      </div>

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
                  <TitleOptionCard key={i} option={t} index={i} boundUseTitle={boundUseTitle} />
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
            <p className="text-xs text-muted-foreground">
              &quot;Use&quot; adds a hook to Hook Library and marks it as the one used on this item.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <HookListField label="Visual Hooks" items={data.visualHooks} boundUse={boundUseHook("visual")} />
              <HookListField label="Textual Hooks" items={data.textualHooks} boundUse={boundUseHook("text")} />
              <HookListField label="Verbal Hooks" items={data.verbalHooks} boundUse={boundUseHook("verbal")} />
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
