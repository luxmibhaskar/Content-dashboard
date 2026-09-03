"use client";

import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/glow-card";
import { CollapsibleSection } from "@/components/collapsible-section";
import { PasteImportSection } from "@/components/paste-import-section";
import {
  ScoreBadge,
  Field,
  ListField,
  StatusSelect,
  countMarkers,
  MarkerCountBadge,
  EditableCard,
  type EditableFieldSpec,
} from "@/components/manual-workflow-ui";
import {
  PACKAGING_PASTE_TEMPLATE_HINT,
  type PackagingPhaseData,
  type PackagingTitleOption,
  type ThumbnailSuggestion,
} from "@/lib/manual-workflow-parsing";
import {
  importPackagingPhase,
  updateManualWorkflowPhaseStatus,
  updateManualWorkflowPhaseData,
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
  onSave,
}: {
  option: PackagingTitleOption;
  index: number;
  boundUseTitle: (formData: FormData) => Promise<void>;
  onSave: (updated: PackagingTitleOption) => Promise<void>;
}) {
  const fields: EditableFieldSpec[] = [
    { key: "title", label: "Title", value: option.title },
    { key: "researchSupport", label: "Research support", value: option.researchSupport },
    { key: "viewerProblemAddressed", label: "Viewer problem addressed", value: option.viewerProblemAddressed },
    { key: "promiseMade", label: "Promise made", value: option.promiseMade },
    { key: "reasonToClick", label: "Reason to click", value: option.reasonToClick },
    { key: "riskOfMisleading", label: "Risk of misleading", value: option.riskOfMisleading },
  ];

  return (
    <GlowCard neutral className="space-y-2 p-3.5" textHeavy>
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <span>
            Title {index + 1}: {option.title}
          </span>
          <MarkerCountBadge count={countMarkers(option)} />
        </p>
        <form action={boundUseTitle}>
          <input type="hidden" name="value" value={option.title} />
          <Button type="submit" size="xs" variant="outline" className="shrink-0">
            Use
          </Button>
        </form>
      </div>
      <EditableCard
        fields={fields}
        onSave={async (patch) => onSave({ ...option, ...(patch as unknown as PackagingTitleOption) })}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Research support" value={option.researchSupport} />
          <Field label="Viewer problem addressed" value={option.viewerProblemAddressed} />
          <Field label="Promise made" value={option.promiseMade} />
          <Field label="Reason to click" value={option.reasonToClick} />
        </div>
        <Field label="Risk of misleading" value={option.riskOfMisleading} />
      </EditableCard>
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

function ThumbnailCard({
  thumbnail,
  index,
  onSave,
}: {
  thumbnail: ThumbnailSuggestion;
  index: number;
  onSave: (updated: ThumbnailSuggestion) => Promise<void>;
}) {
  const fields: EditableFieldSpec[] = [
    { key: "concept", label: "Concept / short name", value: thumbnail.concept },
    { key: "mainVisual", label: "Main visual", value: thumbnail.mainVisual },
    {
      key: "subjectActionOrExpression",
      label: "Subject action or expression",
      value: thumbnail.subjectActionOrExpression,
    },
    { key: "thumbnailText", label: "Thumbnail text", value: thumbnail.thumbnailText },
    { key: "colorDirection", label: "Color direction", value: thumbnail.colorDirection },
    { key: "emotionalTrigger", label: "Emotional trigger", value: thumbnail.emotionalTrigger },
    { key: "whyItFits", label: "Why it fits", value: thumbnail.whyItFits },
    { key: "whatToAvoid", label: "What to avoid", value: thumbnail.whatToAvoid },
  ];

  return (
    <GlowCard neutral className="space-y-2 p-3.5" textHeavy>
      <p className="flex items-center gap-2 text-sm font-semibold">
        <span>
          Thumbnail {index + 1}: {thumbnail.concept}
        </span>
        <MarkerCountBadge count={countMarkers(thumbnail)} />
      </p>
      <EditableCard
        fields={fields}
        onSave={async (patch) => onSave({ ...thumbnail, ...(patch as unknown as ThumbnailSuggestion) })}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Main visual" value={thumbnail.mainVisual} />
          <Field label="Subject action or expression" value={thumbnail.subjectActionOrExpression} />
          <Field label="Thumbnail text" value={thumbnail.thumbnailText} />
          <Field label="Color direction" value={thumbnail.colorDirection} />
          <Field label="Emotional trigger" value={thumbnail.emotionalTrigger} />
          <Field label="Why it fits" value={thumbnail.whyItFits} />
        </div>
        <Field label="What to avoid" value={thumbnail.whatToAvoid} />
      </EditableCard>
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

  // Same "clone data, replace one slice, re-save everything" model as
  // research-phase-content.tsx's saveData - see that file's comment.
  async function saveData(updater: (d: PackagingPhaseData) => PackagingPhaseData) {
    if (!data) return;
    await updateManualWorkflowPhaseData(contentId, "packaging", updater(data));
  }

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
              <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span>Titles ({data.titles.length})</span>
                <MarkerCountBadge count={countMarkers(data.titles)} />
              </p>
              <div className="space-y-2">
                {data.titles.map((t, i) => (
                  <TitleOptionCard
                    key={i}
                    option={t}
                    index={i}
                    boundUseTitle={boundUseTitle}
                    onSave={async (updated) =>
                      saveData((d) => ({ ...d, titles: d.titles.map((o, idx) => (idx === i ? updated : o)) }))
                    }
                  />
                ))}
              </div>
            </div>
          )}

          <CollapsibleSection
            title="Copy-Ready Platform Versions"
            titleSuffix={<MarkerCountBadge count={countMarkers(data.platformCopy)} />}
            glow={1}
          >
            <EditableCard
              fields={(Object.keys(PLATFORM_COPY_LABELS) as (keyof PackagingPhaseData["platformCopy"])[]).map(
                (key) => ({ key, label: PLATFORM_COPY_LABELS[key], value: data.platformCopy[key] }),
              )}
              onSave={async (patch) =>
                saveData((d) => ({
                  ...d,
                  platformCopy: { ...d.platformCopy, ...(patch as unknown as PackagingPhaseData["platformCopy"]) },
                }))
              }
            >
              <div className="space-y-3">
                {(Object.keys(PLATFORM_COPY_LABELS) as (keyof PackagingPhaseData["platformCopy"])[]).map(
                  (key) => (
                    <Field key={key} label={PLATFORM_COPY_LABELS[key]} value={data.platformCopy[key]} />
                  ),
                )}
              </div>
            </EditableCard>
          </CollapsibleSection>

          <GlowCard glow={2} className="space-y-3 p-3.5" textHeavy>
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span>Keywords &amp; Phrases</span>
              <MarkerCountBadge
                count={countMarkers({ shortKeywords: data.shortKeywords, searchPhrases: data.searchPhrases })}
              />
            </p>
            <EditableCard
              fields={[
                { key: "shortKeywords", label: "Short Keywords", kind: "list", value: data.shortKeywords },
                { key: "searchPhrases", label: "Search Phrases", kind: "list", value: data.searchPhrases },
              ]}
              onSave={async (patch) => saveData((d) => ({ ...d, ...(patch as Partial<PackagingPhaseData>) }))}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <ListField label="Short Keywords" items={data.shortKeywords} />
                <ListField label="Search Phrases" items={data.searchPhrases} />
              </div>
            </EditableCard>
          </GlowCard>

          {data.thumbnails.length > 0 && (
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span>Thumbnails ({data.thumbnails.length})</span>
                <MarkerCountBadge count={countMarkers(data.thumbnails)} />
              </p>
              <div className="space-y-2">
                {data.thumbnails.map((t, i) => (
                  <ThumbnailCard
                    key={i}
                    thumbnail={t}
                    index={i}
                    onSave={async (updated) =>
                      saveData((d) => ({ ...d, thumbnails: d.thumbnails.map((th, idx) => (idx === i ? updated : th)) }))
                    }
                  />
                ))}
              </div>
            </div>
          )}

          <GlowCard glow={3} className="space-y-3 p-3.5" textHeavy>
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span>Hooks</span>
              <MarkerCountBadge
                count={countMarkers({
                  visualHooks: data.visualHooks,
                  textualHooks: data.textualHooks,
                  verbalHooks: data.verbalHooks,
                })}
              />
            </p>
            <p className="text-xs text-muted-foreground">
              &quot;Use&quot; adds a hook to Hook Library and marks it as the one used on this item.
            </p>
            <EditableCard
              fields={[
                { key: "visualHooks", label: "Visual Hooks", kind: "list", value: data.visualHooks },
                { key: "textualHooks", label: "Textual Hooks", kind: "list", value: data.textualHooks },
                { key: "verbalHooks", label: "Verbal Hooks", kind: "list", value: data.verbalHooks },
              ]}
              onSave={async (patch) => saveData((d) => ({ ...d, ...(patch as Partial<PackagingPhaseData>) }))}
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <HookListField label="Visual Hooks" items={data.visualHooks} boundUse={boundUseHook("visual")} />
                <HookListField label="Textual Hooks" items={data.textualHooks} boundUse={boundUseHook("text")} />
                <HookListField label="Verbal Hooks" items={data.verbalHooks} boundUse={boundUseHook("verbal")} />
              </div>
            </EditableCard>
          </GlowCard>

          <GlowCard glow={1} className="space-y-3 p-3.5" textHeavy>
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span>Carousel Evaluation</span>
              <MarkerCountBadge count={countMarkers(data.carousel)} />
            </p>
            <EditableCard
              fields={[
                { key: "recommendation", label: "Recommendation", value: data.carousel.recommendation },
                { key: "bestPlatform", label: "Best platform", value: data.carousel.bestPlatform },
                {
                  key: "recommendedSlideCount",
                  label: "Recommended slide count",
                  value: data.carousel.recommendedSlideCount,
                },
                { key: "bestCarouselAngle", label: "Best carousel angle", value: data.carousel.bestCarouselAngle },
                { key: "designDirection", label: "Design direction", value: data.carousel.designDirection },
                { key: "colorDirection", label: "Color direction", value: data.carousel.colorDirection },
                { key: "finalSlideCta", label: "Final-slide CTA", value: data.carousel.finalSlideCta },
                { key: "viewerTakeaway", label: "Viewer takeaway", value: data.carousel.viewerTakeaway },
                { key: "reason", label: "Reason", value: data.carousel.reason },
                {
                  key: "titleOptions",
                  label: "Carousel title options",
                  kind: "list",
                  value: data.carousel.titleOptions,
                },
                {
                  key: "suitabilityScore",
                  label: "Suitability score",
                  kind: "number",
                  value: data.carousel.suitabilityScore,
                },
              ]}
              onSave={async (patch) =>
                saveData((d) => ({
                  ...d,
                  carousel: { ...d.carousel, ...(patch as unknown as PackagingPhaseData["carousel"]) },
                }))
              }
            >
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
            </EditableCard>
          </GlowCard>

          <GlowCard glow={2} className="space-y-3 p-3.5" textHeavy>
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span>CTA Options</span>
              <MarkerCountBadge count={countMarkers(data.ctaOptions)} />
            </p>
            <EditableCard
              fields={[
                { key: "engagement", label: "Engagement CTA", value: data.ctaOptions.engagement },
                { key: "saveShare", label: "Save/share CTA", value: data.ctaOptions.saveShare },
                {
                  key: "followSubscribeResourceConversion",
                  label: "Follow/subscribe/resource/conversion CTA",
                  value: data.ctaOptions.followSubscribeResourceConversion,
                },
              ]}
              onSave={async (patch) =>
                saveData((d) => ({
                  ...d,
                  ctaOptions: { ...d.ctaOptions, ...(patch as unknown as PackagingPhaseData["ctaOptions"]) },
                }))
              }
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Engagement CTA" value={data.ctaOptions.engagement} />
                <Field label="Save/share CTA" value={data.ctaOptions.saveShare} />
                <Field
                  label="Follow/subscribe/resource/conversion CTA"
                  value={data.ctaOptions.followSubscribeResourceConversion}
                />
              </div>
            </EditableCard>
          </GlowCard>

          <GlowCard glow={3} className="space-y-3 p-3.5" textHeavy>
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span>Recommendations</span>
              <MarkerCountBadge count={countMarkers(data.recommendations)} />
            </p>
            <EditableCard
              fields={[
                { key: "strongestTitle", label: "Strongest title", value: data.recommendations.strongestTitle },
                {
                  key: "strongestVisualHook",
                  label: "Strongest visual hook",
                  value: data.recommendations.strongestVisualHook,
                },
                {
                  key: "strongestTextualHook",
                  label: "Strongest textual hook",
                  value: data.recommendations.strongestTextualHook,
                },
                {
                  key: "strongestVerbalHook",
                  label: "Strongest verbal hook",
                  value: data.recommendations.strongestVerbalHook,
                },
                {
                  key: "strongestThumbnail",
                  label: "Strongest thumbnail",
                  value: data.recommendations.strongestThumbnail,
                },
                { key: "strongestCta", label: "Strongest CTA", value: data.recommendations.strongestCta },
              ]}
              onSave={async (patch) =>
                saveData((d) => ({
                  ...d,
                  recommendations: {
                    ...d.recommendations,
                    ...(patch as unknown as PackagingPhaseData["recommendations"]),
                  },
                }))
              }
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Strongest title" value={data.recommendations.strongestTitle} />
                <Field label="Strongest visual hook" value={data.recommendations.strongestVisualHook} />
                <Field label="Strongest textual hook" value={data.recommendations.strongestTextualHook} />
                <Field label="Strongest verbal hook" value={data.recommendations.strongestVerbalHook} />
                <Field label="Strongest thumbnail" value={data.recommendations.strongestThumbnail} />
                <Field label="Strongest CTA" value={data.recommendations.strongestCta} />
              </div>
            </EditableCard>
          </GlowCard>
        </div>
      )}
    </div>
  );
}
