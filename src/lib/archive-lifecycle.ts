import type { SupabaseClient } from "@supabase/supabase-js";
import { getDriveClient, findOrCreateFolder, findFolder, readTextFile } from "@/lib/google-drive";
import { rootFolderIdFor, sanitizeName } from "@/lib/drive-archive";
import type { Brand } from "@/lib/brand";
import type { ContentArchiveCompanion, ResearchArchiveCompanion } from "@/lib/types";

const ARCHIVE_AFTER_DAYS = 7;

// Section 17.4: "once a content item has been Published for 7 days, its
// heavy fields archive out of Supabase automatically." Only runs after
// that night's Drive sync has already written a fresh companion for
// this item (see backup.ts's ordering), so what gets cleared here is
// always already safely duplicated first.
export async function archiveIdleContent(supabase: SupabaseClient, brand: Brand) {
  const cutoff = new Date(Date.now() - ARCHIVE_AFTER_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: eligible, error: findError } = await supabase
    .from("content_calendar")
    .select("id")
    .eq("brand", brand)
    .eq("production_status", "Published")
    .eq("is_archived", false)
    .not("last_active_at", "is", null)
    .lte("last_active_at", cutoff);

  if (findError) throw new Error(findError.message);

  const archivedIds: string[] = [];
  const errors: string[] = [];

  for (const row of eligible ?? []) {
    try {
      await archiveOneItem(supabase, row.id);
      archivedIds.push(row.id);
    } catch (err) {
      errors.push(`${row.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { archivedIds, errors };
}

async function archiveOneItem(supabase: SupabaseClient, contentId: string) {
  const [{ error: e1 }, { error: e2 }, { error: e3 }, { error: e4 }, { error: e5 }] = await Promise.all([
    supabase
      .from("content_calendar")
      .update({ full_script: null, main_pointers: [], is_archived: true })
      .eq("id", contentId),
    supabase.from("title_variants").delete().eq("content_id", contentId).eq("is_live", false),
    supabase.from("hook_variants").delete().eq("content_id", contentId).eq("is_live", false),
    supabase.from("thumbnail_variants").delete().eq("content_id", contentId).eq("is_live", false),
    supabase
      .from("reference_videos")
      .update({ hook_note: null, rehook_note: null, cta_note: null })
      .eq("content_id", contentId),
  ]);

  for (const error of [e1, e2, e3, e4, e5]) {
    if (error) throw new Error(error.message);
  }

  const { error: e6 } = await supabase
    .from("research_snapshots")
    .update({ youtube_data: null, google_data: null, reddit_data: null, quora_data: null })
    .eq("content_id", contentId);
  if (e6) throw new Error(e6.message);
}

// Section 17.4: "opening an archived item's full detail (research,
// script, variants) fetches it back from the Drive archive into
// Supabase." Called from the topic page's data-loading step, before
// render, so the page never shows a half-archived item.
export async function retrieveContentDetail(supabase: SupabaseClient, contentId: string, brand: Brand) {
  const drive = getDriveClient();
  const rootId = rootFolderIdFor(brand);
  const contentFolderId = await findFolder(drive, rootId, "content-calendar");
  if (!contentFolderId) return;

  const raw = await readTextFile(drive, contentFolderId, `${contentId}.json`);
  if (!raw) return;

  const companion = JSON.parse(raw) as ContentArchiveCompanion;

  const inserts: PromiseLike<{ error: { message: string } | null }>[] = [];
  if (companion.title_variants.length > 0) {
    inserts.push(
      supabase.from("title_variants").insert(
        companion.title_variants.map((v) => ({ ...v, content_id: contentId, brand, is_live: false })),
      ),
    );
  }
  if (companion.hook_variants.length > 0) {
    inserts.push(
      supabase.from("hook_variants").insert(
        companion.hook_variants.map((v) => ({ ...v, content_id: contentId, brand, is_live: false })),
      ),
    );
  }
  if (companion.thumbnail_variants.length > 0) {
    inserts.push(
      supabase.from("thumbnail_variants").insert(
        companion.thumbnail_variants.map((v) => ({ ...v, content_id: contentId, brand, is_live: false })),
      ),
    );
  }
  for (const ref of companion.reference_videos) {
    inserts.push(
      supabase
        .from("reference_videos")
        .update({ hook_note: ref.hook_note, rehook_note: ref.rehook_note, cta_note: ref.cta_note })
        .eq("id", ref.id),
    );
  }

  const results = await Promise.all(inserts);
  for (const { error } of results) {
    if (error) throw new Error(error.message);
  }

  const { error } = await supabase
    .from("content_calendar")
    .update({
      full_script: companion.full_script,
      main_pointers: companion.main_pointers,
      is_archived: false,
      last_active_at: new Date().toISOString(),
    })
    .eq("id", contentId);
  if (error) throw new Error(error.message);
}

// Section 17.4, per-snapshot: the Research tab only needs the one
// snapshot actually being viewed restored, not every historical pull
// for that topic, so this runs lazily per snapshot rather than eagerly
// for all of them when the content item itself is opened.
export async function retrieveResearchSnapshot(
  supabase: SupabaseClient,
  snapshotId: string,
  contentTitle: string,
  brand: Brand,
) {
  const drive = getDriveClient();
  const rootId = rootFolderIdFor(brand);
  const researchFolderId = await findOrCreateFolder(drive, rootId, "research-snapshots");
  const topicFolderId = await findFolder(drive, researchFolderId, sanitizeName(contentTitle));
  if (!topicFolderId) return;

  const raw = await readTextFile(drive, topicFolderId, `${snapshotId}.json`);
  if (!raw) return;

  const companion = JSON.parse(raw) as ResearchArchiveCompanion;

  const { error } = await supabase
    .from("research_snapshots")
    .update({
      youtube_data: companion.youtube_data,
      google_data: companion.google_data,
      reddit_data: companion.reddit_data,
      quora_data: companion.quora_data,
    })
    .eq("id", snapshotId);
  if (error) throw new Error(error.message);
}
