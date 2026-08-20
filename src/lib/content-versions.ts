import type { createClient } from "@/lib/supabase/server";
import type { VersionSource } from "@/lib/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type VersionTable = "research_copy_versions" | "scripts_versions";

// Manual (pasted) and AI (Run) versions coexist per content item
// (supabase/migrations/0015_research_copy_scripts_versions.sql),
// mirroring the title_variants/hook_variants/thumbnail_variants is_live
// pattern. Shared by research-copy-actions.ts and scripts-actions.ts,
// both tables need the exact same "upsert this source's row, activate
// it only if nothing is active yet" and "flip active to a different
// source" logic.
//
// Auto-activate only when no version is live yet (a brand-new item's
// first version, of either source, has to become active, there's
// nothing else it could be): saving a second version, or re-saving an
// existing one, never silently reassigns which version is active,
// that's a deliberate creator choice (setActiveVersion below), not a
// side effect of Run or Paste.
export async function upsertVersionAndAutoActivate<T>(
  supabase: SupabaseServerClient,
  table: VersionTable,
  contentId: string,
  brand: string,
  source: VersionSource,
  data: T,
) {
  const { error } = await supabase
    .from(table)
    .upsert({ content_id: contentId, brand, source, data }, { onConflict: "content_id,source" });
  if (error) throw new Error(error.message);

  const { data: liveRows, error: liveError } = await supabase
    .from(table)
    .select("id")
    .eq("content_id", contentId)
    .eq("is_live", true);
  if (liveError) throw new Error(liveError.message);

  if (!liveRows || liveRows.length === 0) {
    const { error: activateError } = await supabase
      .from(table)
      .update({ is_live: true })
      .eq("content_id", contentId)
      .eq("source", source);
    if (activateError) throw new Error(activateError.message);
  }
}

// Two sequential updates, not a single atomic transaction (the
// Supabase JS client has no multi-statement transaction API without a
// dedicated RPC function, and this app doesn't use one anywhere else).
// A crash between them would briefly leave no row active for this
// content item; acceptable here, single-user tool, no concurrent
// writers to race against.
export async function setActiveVersion(
  supabase: SupabaseServerClient,
  table: VersionTable,
  contentId: string,
  source: VersionSource,
) {
  const { error: unsetError } = await supabase
    .from(table)
    .update({ is_live: false })
    .eq("content_id", contentId)
    .eq("is_live", true);
  if (unsetError) throw new Error(unsetError.message);

  const { error: setError } = await supabase
    .from(table)
    .update({ is_live: true })
    .eq("content_id", contentId)
    .eq("source", source);
  if (setError) throw new Error(setError.message);
}
