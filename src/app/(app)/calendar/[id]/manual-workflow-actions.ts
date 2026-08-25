"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseResearchPhasePaste, extractApprovalStatus } from "@/lib/manual-workflow-parsing";

export type ImportManualPhaseState = { fallbackRaw: string | null };

// "Paste from AI chat" for the Manual workflow's Research phase
// (docs/manual-workflow-redesign.md Phase B). Same shape as
// importResearchCopyPaste/importScriptsPaste (research-copy-actions.ts/
// scripts-actions.ts): free pattern-based parsing, no Claude API call,
// low-confidence parse returns the raw text back to the form instead of
// guessing. One row per (content_id, phase) here rather than a
// manual/ai split, so this is a plain upsert, not the
// upsertVersionAndAutoActivate dance those two use.
export async function importResearchPhase(
  contentId: string,
  _prevState: ImportManualPhaseState,
  formData: FormData,
): Promise<ImportManualPhaseState> {
  const pastedText = String(formData.get("pasted_text") ?? "");
  const parsed = parseResearchPhasePaste(pastedText);
  if (!parsed) {
    return { fallbackRaw: pastedText };
  }

  const supabase = await createClient();
  const { data: item, error: itemError } = await supabase
    .from("content_calendar")
    .select("brand")
    .eq("id", contentId)
    .single();
  if (itemError || !item) {
    return { fallbackRaw: pastedText };
  }

  const status = extractApprovalStatus(parsed.researchQualityStatusText);

  await supabase.from("manual_workflow_phases").upsert(
    {
      content_id: contentId,
      brand: item.brand,
      phase: "research",
      raw_pasted_text: pastedText,
      parsed_data: parsed,
      status,
    },
    { onConflict: "content_id,phase" },
  );

  revalidatePath(`/calendar/${contentId}`);
  return { fallbackRaw: null };
}
