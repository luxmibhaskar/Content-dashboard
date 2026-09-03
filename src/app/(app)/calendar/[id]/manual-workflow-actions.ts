"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  parseResearchPhasePaste,
  parsePackagingPhasePaste,
  parseScriptingPhasePaste,
  extractApprovalStatus,
} from "@/lib/manual-workflow-parsing";
import type { ManualWorkflowPhase, ManualWorkflowStatus } from "@/lib/types";

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

// docs/manual-workflow-redesign.md Phase C. No status extraction here:
// Packaging's own template has no APPROVED/NEEDS REVISION/REJECTED
// field (approval happens by the user typing the next-phase instruction
// to their AI chat, not a parsed line). `status` is deliberately omitted
// from the upsert below (not set to null) - Packaging can now carry a
// manually-set status (updateManualWorkflowPhaseStatus), and unlike
// Research/Scripting there's no freshly-parsed value here to overwrite
// it with, so a re-paste must leave whatever's already there alone
// rather than wiping it back to null every time.
export async function importPackagingPhase(
  contentId: string,
  _prevState: ImportManualPhaseState,
  formData: FormData,
): Promise<ImportManualPhaseState> {
  const pastedText = String(formData.get("pasted_text") ?? "");
  const parsed = parsePackagingPhasePaste(pastedText);
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

  await supabase.from("manual_workflow_phases").upsert(
    {
      content_id: contentId,
      brand: item.brand,
      phase: "packaging",
      raw_pasted_text: pastedText,
      parsed_data: parsed,
    },
    { onConflict: "content_id,phase" },
  );

  revalidatePath(`/calendar/${contentId}`);
  return { fallbackRaw: null };
}

// docs/manual-workflow-redesign.md Phase D. Status extraction, same as
// Research: the template's own Script status line (APPROVED / NEEDS
// REVISION / REJECTED) becomes this row's typed status column too.
export async function importScriptingPhase(
  contentId: string,
  _prevState: ImportManualPhaseState,
  formData: FormData,
): Promise<ImportManualPhaseState> {
  const pastedText = String(formData.get("pasted_text") ?? "");
  const parsed = parseScriptingPhasePaste(pastedText);
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

  const status = extractApprovalStatus(parsed.scriptStatusText);

  await supabase.from("manual_workflow_phases").upsert(
    {
      content_id: contentId,
      brand: item.brand,
      phase: "scripting",
      raw_pasted_text: pastedText,
      parsed_data: parsed,
      status,
    },
    { onConflict: "content_id,phase" },
  );

  revalidatePath(`/calendar/${contentId}`);
  return { fallbackRaw: null };
}

// Manual status override, separate from the parsed-from-text status
// importResearchPhase/importScriptingPhase set. For Research and
// Scripting, re-pasting still re-derives status from the freshly parsed
// text (explicit preference: a dropdown override isn't meant to survive
// a fresh paste of different content) - this only changes what's
// already there, it doesn't stop the next paste from overwriting it
// again. For Packaging, which has no parsed status at all, this is the
// only way its status column ever gets set, and importPackagingPhase's
// own upsert deliberately leaves it alone.
export async function updateManualWorkflowPhaseStatus(
  contentId: string,
  phase: ManualWorkflowPhase,
  formData: FormData,
): Promise<void> {
  const raw = String(formData.get("status") ?? "");
  const status: ManualWorkflowStatus | null =
    raw === "approved" || raw === "needs_revision" || raw === "rejected" ? raw : null;

  const supabase = await createClient();
  await supabase.from("manual_workflow_phases").update({ status }).eq("content_id", contentId).eq("phase", phase);

  revalidatePath(`/calendar/${contentId}`);
}
