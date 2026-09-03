"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/glow-card";
import { PasteImportSection } from "@/components/paste-import-section";
import { StatusSelect, ScoreBadge, Field, ListField, MarkerText } from "@/components/manual-workflow-ui";
import {
  SCRIPTING_PASTE_TEMPLATE_HINT,
  type LongFormScriptSection,
  type PointerScriptSection,
  type ShortFormScript,
  type CarouselScriptSlide,
  type ScriptingPhaseData,
} from "@/lib/manual-workflow-parsing";
import {
  importScriptingPhase,
  updateManualWorkflowPhaseStatus,
} from "@/app/(app)/calendar/[id]/manual-workflow-actions";
import type { ManualWorkflowStatus } from "@/lib/types";

type ScriptingSubTab = "longform" | "pointer" | "shortform" | "carousel" | "closing";

const SUB_TAB_LABELS: Record<ScriptingSubTab, string> = {
  longform: "Long-Form Script",
  pointer: "Pointer Script",
  shortform: "Short-Form",
  carousel: "Carousel",
  closing: "Closing",
};

const SUB_TABS: ScriptingSubTab[] = ["longform", "pointer", "shortform", "carousel", "closing"];

function LongFormSectionCard({ section, index }: { section: LongFormScriptSection; index: number }) {
  return (
    <GlowCard neutral className="space-y-2 p-3.5" textHeavy>
      <p className="text-sm font-semibold">
        {index + 1}. {section.sectionTitle}
      </p>
      <Field label="Purpose" value={section.purpose} />
      <Field label="Exact narration" value={section.exactNarration} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Visual direction" value={section.visualDirection} />
        <Field label="On-screen text" value={section.onScreenText} />
        <Field label="B-roll or demonstration" value={section.bRollOrDemonstration} />
        <Field label="Transition" value={section.transition} />
        <Field label="Approximate timing" value={section.approximateTiming} />
        <Field label="Source markers" value={section.sourceMarkers} />
      </div>
    </GlowCard>
  );
}

function PointerSectionCard({ section, index }: { section: PointerScriptSection; index: number }) {
  return (
    <GlowCard neutral className="space-y-2 p-3.5" textHeavy>
      <p className="text-sm font-semibold">
        {index + 1}. {section.sectionTitle}
      </p>
      <Field label="Main pointer" value={section.mainPointer} />
      <Field label="Brief description" value={section.briefDescription} />
      <Field label="Key information that must be covered" value={section.keyInformation} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Why it matters to the viewer" value={section.whyItMatters} />
        <Field label="Example to include" value={section.exampleToInclude} />
        <Field label="Question this point answers" value={section.questionAnswered} />
        <Field label="Mistake to avoid" value={section.mistakeToAvoid} />
        <Field label="Transition idea" value={section.transitionIdea} />
        <Field label="Approximate timing" value={section.approximateTiming} />
        <Field label="Source marker" value={section.sourceMarker} />
      </div>
    </GlowCard>
  );
}

function ShortFormScriptCard({ script, label }: { script: ShortFormScript; label: string }) {
  return (
    <GlowCard neutral className="space-y-2 p-3.5" textHeavy>
      <p className="text-sm font-semibold">
        {label}: {script.title}
      </p>
      <Field label="Hook" value={script.hook} />
      <Field label="Spoken script" value={script.spokenScript} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Viewer problem" value={script.viewerProblem} />
        <Field label="One clear insight" value={script.oneClearInsight} />
        <Field label="Example" value={script.example} />
        <Field label="Practical takeaway" value={script.practicalTakeaway} />
        <Field label="Visual plan" value={script.visualPlan} />
        <Field label="On-screen text" value={script.onScreenText} />
        <Field label="B-roll" value={script.bRoll} />
        <Field label="Source markers" value={script.sourceMarkers} />
      </div>
      <Field label="Brief description" value={script.briefDescription} />
      <ListField label="CTA options" items={script.ctaOptions} />
    </GlowCard>
  );
}

function CarouselSlideCard({ slide }: { slide: CarouselScriptSlide }) {
  return (
    <GlowCard neutral className="space-y-2 p-3.5" textHeavy>
      <p className="text-sm font-semibold">
        Slide {slide.slideNumber}: {slide.headline}
      </p>
      <Field label="Body" value={slide.body} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Visual direction" value={slide.visualDirection} />
        <Field label="Design note" value={slide.designNote} />
        <Field label="Source marker" value={slide.sourceMarker} />
      </div>
    </GlowCard>
  );
}

function SubTabContent({ subTab, data }: { subTab: ScriptingSubTab; data: ScriptingPhaseData }) {
  if (subTab === "longform") {
    return (
      <div className="space-y-2">
        {data.longFormScript.map((s, i) => (
          <LongFormSectionCard key={i} section={s} index={i} />
        ))}
      </div>
    );
  }

  if (subTab === "pointer") {
    return (
      <div className="space-y-2">
        {data.pointerScript.map((s, i) => (
          <PointerSectionCard key={i} section={s} index={i} />
        ))}
      </div>
    );
  }

  if (subTab === "shortform") {
    const suit = data.shortFormSuitability;
    return (
      <div className="space-y-3">
        <GlowCard glow={2} className="space-y-3 p-3.5" textHeavy>
          <p className="text-xs font-medium text-muted-foreground">Short-Form Suitability</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Suitable" value={suit.suitable} />
            <Field label="Best standalone insight" value={suit.bestStandaloneInsight} />
            <Field label="Best section to convert" value={suit.bestSectionToConvert} />
            <Field label="Best platform" value={suit.bestPlatform} />
            <Field label="Recommended duration" value={suit.recommendedDuration} />
            <Field label="Recommended conversion method" value={suit.recommendedConversionMethod} />
            <Field label="Context risk" value={suit.contextRisk} />
            <Field label="Accuracy protection" value={suit.accuracyProtection} />
          </div>
          <Field label="Reason" value={suit.reason} />
          <div className="border-t border-border pt-3">
            <ScoreBadge label="Suitability" value={suit.score} />
          </div>
        </GlowCard>

        {!data.thirtySecondScript && !data.sixtySecondScript && data.additionalShortFormConcepts.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No short-form scripts pasted (the template only creates these once the suitability score is
            6 or higher).
          </p>
        )}

        {data.thirtySecondScript && (
          <ShortFormScriptCard script={data.thirtySecondScript} label="30-Second Script" />
        )}
        {data.sixtySecondScript && (
          <ShortFormScriptCard script={data.sixtySecondScript} label="60-Second Script" />
        )}
        {data.additionalShortFormConcepts.map((s, i) => (
          <ShortFormScriptCard key={i} script={s} label={`Concept ${i + 1}`} />
        ))}
      </div>
    );
  }

  if (subTab === "carousel") {
    if (data.carouselScript.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">
          No carousel script pasted (the template only creates one when Packaging recommended a
          carousel for this topic).
        </p>
      );
    }
    return (
      <div className="space-y-2">
        {data.carouselScript.map((slide, i) => (
          <CarouselSlideCard key={i} slide={slide} />
        ))}
      </div>
    );
  }

  // closing
  return (
    <GlowCard glow={3} className="space-y-3 p-3.5" textHeavy>
      <Field label="Script strengths" value={data.scriptStrengths} />
      <Field label="Claims requiring verification" value={data.claimsRequiringVerification} />
      <Field label="Missing examples" value={data.missingExamples} />
      <Field label="Personal information needed" value={data.personalInformationNeeded} />
      <Field label="Recommended production step" value={data.recommendedProductionStep} />
      <div>
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Script Status</p>
        </div>
        <p className="mt-0.5 text-sm leading-relaxed whitespace-pre-wrap">
          <MarkerText text={data.scriptStatusText} />
        </p>
      </div>
    </GlowCard>
  );
}

// docs/manual-workflow-redesign.md Phase D: full display of the
// Scripting phase's output. This is the largest single phase (two
// complete script versions, up to 5 short-form scripts, an optional
// carousel script, plus its own closing fields), so unlike Research/
// Packaging's single flat stack of sections, this adds its own inner
// sub-tabs (Long-Form / Pointer / Short-Form / Carousel / Closing) - one
// section's worth of content at a time inside the phase's own
// max-h-[70vh] scroll box (manual-workflow-panel.tsx), not the entire
// phase concatenated into one scroll. The sub-tab bar is sticky within
// that box so switching sections never requires scrolling back up first.
export function ScriptingPhaseContent({
  contentId,
  data,
  status,
  hasExistingImport,
}: {
  contentId: string;
  data: ScriptingPhaseData | null;
  status: ManualWorkflowStatus | null;
  hasExistingImport: boolean;
}) {
  const [subTab, setSubTab] = useState<ScriptingSubTab>("longform");
  const boundImportAction = importScriptingPhase.bind(null, contentId);
  const boundStatusAction = updateManualWorkflowPhaseStatus.bind(null, contentId, "scripting");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Scripting</p>
        {hasExistingImport && <StatusSelect status={status} action={boundStatusAction} />}
      </div>

      <PasteImportSection action={boundImportAction} templateHint={SCRIPTING_PASTE_TEMPLATE_HINT} />
      {!data && !hasExistingImport && (
        <p className="text-sm text-muted-foreground">
          Nothing pasted yet. Run the Phase 3 prompt in your AI chat of choice once Packaging is
          approved, then paste the response above.
        </p>
      )}

      {data && (
        <div>
          <div className="sticky top-0 z-10 -mx-4 bg-background px-4 py-2">
            <div className="inline-flex flex-wrap items-center gap-0.5 rounded-lg border border-border p-0.5">
              {SUB_TABS.map((tab) => (
                <Button
                  key={tab}
                  type="button"
                  size="xs"
                  variant={subTab === tab ? "default" : "ghost"}
                  onClick={() => setSubTab(tab)}
                >
                  {SUB_TAB_LABELS[tab]}
                </Button>
              ))}
            </div>
          </div>

          <div className="mt-3">
            <SubTabContent subTab={subTab} data={data} />
          </div>
        </div>
      )}
    </div>
  );
}
