"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { HookLibraryType } from "@/lib/types";

// docs/platform-performance-tracking.md Section 7: Manual Packaging's
// three hook types only (visualHooks/textualHooks/verbalHooks,
// PackagingPhaseData) - AI's Packaging phase has no equivalent
// categorized hook fields, confirmed before building this, so there's
// nothing for an AI-side "Use" action to point at yet. Two writes:
// - hook_library_entries: a real swipe-file entry, same table the
//   Hook Library page's own CSV/JSON import already writes to, no
//   dedup guard, same reasoning that page's own import has none.
// - hook_variants: the existing is_live-exclusive pattern
//   (title_variants/hook_variants/thumbnail_variants,
//   supabase/migrations/0001_init.sql) already read by
//   hook-library/page.tsx's "Hook Patterns" aggregation and by this
//   item's own Analytics section (platform-analytics-section.tsx) -
//   this is the "mark as used on this item" mechanism the doc
//   describes, not a new field, that table existed for exactly this
//   and had no write path left feeding it. Two sequential updates
//   (unset the previous live row, then insert the new one), same
//   non-atomic pattern already used for setActiveResearchCopyVersion
//   etc. (docs/topic-page-redesign.md Section 8), this app has no
//   multi-statement transaction API and doesn't need one for a
//   single-user tool with no concurrent writers to race against.
export async function useHook(
  contentId: string,
  brand: string,
  hookType: HookLibraryType,
  formData: FormData,
) {
  const hookText = String(formData.get("value") ?? "").trim();
  if (!hookText) return;

  const supabase = await createClient();

  const { error: libraryError } = await supabase
    .from("hook_library_entries")
    .insert({ brand, type: hookType, content: hookText });
  if (libraryError) {
    throw new Error(libraryError.message);
  }

  const { error: unsetError } = await supabase
    .from("hook_variants")
    .update({ is_live: false })
    .eq("content_id", contentId)
    .eq("is_live", true);
  if (unsetError) {
    throw new Error(unsetError.message);
  }

  // Analytics audit (2026-08-27) Phase 4: hookType was always received
  // here, right at the moment a hook gets marked live, and thrown away -
  // stored now so Analytics Overview's Hook Type Performance
  // (docs/builder-brief.md Section 6.3, an empty shell since Phase 1)
  // has something real to read (0021_hook_variants_type.sql).
  const { error: insertError } = await supabase
    .from("hook_variants")
    .insert({ content_id: contentId, brand, variant_text: hookText, source: "Custom", is_live: true, hook_type: hookType });
  if (insertError) {
    throw new Error(insertError.message);
  }

  revalidatePath(`/calendar/${contentId}`);
  revalidatePath("/hook-library");
}
