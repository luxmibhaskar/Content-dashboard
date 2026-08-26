import fs from "fs";
import path from "path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getDriveClient, findOrCreateFolder, upsertMarkdownFile, upsertJsonFile } from "@/lib/google-drive";
import {
  buildContentCalendarMarkdown,
  buildResearchSnapshotMarkdown,
  buildJourneyMonthMarkdown,
} from "@/lib/markdown-archive";
import type { Brand } from "@/lib/brand";
import type {
  ContentCalendarDetail,
  ContentPlatformPost,
  ResearchSnapshot,
  JourneyEntry,
  ContentArchiveCompanion,
  ResearchArchiveCompanion,
  NonLiveVariant,
  NonLiveThumbnailVariant,
} from "@/lib/types";

export function rootFolderIdFor(brand: Brand): string {
  const key =
    brand === "lbstransformation"
      ? "GOOGLE_DRIVE_BACKUP_FOLDER_ID_LBSTRANSFORMATION"
      : "GOOGLE_DRIVE_BACKUP_FOLDER_ID_LBSWORKS";
  const id = process.env[key];
  if (!id) throw new Error(`${key} is not configured.`);
  return id;
}

export function sanitizeName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
  return (cleaned || "Untitled").slice(0, 150);
}

// Two items can share a title, filenames can't. Every row gets a stable
// name regardless of fetch order, only titles that actually collide pay
// the id-suffix cost, so the common case stays a clean readable filename.
function buildContentFilenames(rows: ContentCalendarDetail[]): Map<string, string> {
  const titles = rows.map((r) => sanitizeName(r.final_title || r.raw_idea_title || "Untitled"));
  const counts = new Map<string, number>();
  titles.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1));

  const filenames = new Map<string, string>();
  rows.forEach((row, i) => {
    const title = titles[i];
    const collides = (counts.get(title) ?? 0) > 1;
    filenames.set(row.id, collides ? `${title} (${row.id.slice(0, 8)}).md` : `${title}.md`);
  });
  return filenames;
}

export type DriveLinks = {
  contentLinks: Map<string, string>;
  snapshotLinks: Map<string, string>;
};

// Section 17.2/17.3: nightly full-content Markdown archive, plus a
// living copy of the build spec at the root as SYSTEM_MANIFEST.md, read
// straight from docs/builder-brief.md so it's always exactly the spec
// this build actually follows, never a hand-kept summary that can drift.
export async function syncDriveArchive(supabase: SupabaseClient, brand: Brand): Promise<DriveLinks> {
  const drive = getDriveClient();
  const rootId = rootFolderIdFor(brand);

  const manifest = fs.readFileSync(path.join(process.cwd(), "docs", "builder-brief.md"), "utf-8");
  await upsertMarkdownFile(drive, rootId, "SYSTEM_MANIFEST.md", manifest);

  const contentFolderId = await findOrCreateFolder(drive, rootId, "content-calendar");
  const researchFolderId = await findOrCreateFolder(drive, rootId, "research-snapshots");
  const journeyFolderId = await findOrCreateFolder(drive, rootId, "journey-log");

  const contentLinks = new Map<string, string>();
  const snapshotLinks = new Map<string, string>();

  const { data: items } = await supabase.from("content_calendar").select("*").eq("brand", brand);
  const contentRows = (items ?? []) as ContentCalendarDetail[];
  const titleById = new Map(
    contentRows.map((r) => [r.id, r.final_title || r.raw_idea_title || "Untitled"]),
  );
  const filenames = buildContentFilenames(contentRows);

  // Section 17.4: only non-live variant rows and reference_videos' note
  // fields ever get cleared from Supabase, so those are the only pieces
  // the retrieve companion needs, live variants and everything else on
  // content_calendar never leaves Supabase in the first place.
  //
  // research_copy_versions/scripts_versions are the one exception to
  // that "only what gets cleared" rule: archiveOneItem never touches
  // them (they stay live in Supabase regardless of archived status), but
  // they're the actual core content this whole app produces and, until
  // now, had zero backup coverage anywhere, real audit finding, not an
  // archive-lifecycle need. Fetched unfiltered (both sources, live or
  // not) since unlike variants there's no "non-live means about to be
  // cleared" relationship here to narrow by.
  const [
    { data: titleVariants },
    { data: hookVariants },
    { data: thumbnailVariants },
    { data: refVideos },
    { data: researchCopyVersions },
    { data: scriptsVersions },
    { data: platformPostRows },
  ] = await Promise.all([
    supabase
      .from("title_variants")
      .select("content_id, variant_text, rank, source, performance_rating")
      .eq("brand", brand)
      .eq("is_live", false),
    supabase
      .from("hook_variants")
      .select("content_id, variant_text, rank, source, performance_rating")
      .eq("brand", brand)
      .eq("is_live", false),
    supabase
      .from("thumbnail_variants")
      .select("content_id, concept, main_text_on_image, visual_elements, emotion_vibe, rank, source, performance_rating")
      .eq("brand", brand)
      .eq("is_live", false),
    supabase.from("reference_videos").select("id, content_id, hook_note, rehook_note, cta_note").eq("brand", brand),
    supabase.from("research_copy_versions").select("content_id, source, is_live, data").eq("brand", brand),
    supabase.from("scripts_versions").select("content_id, source, is_live, data").eq("brand", brand),
    // docs/platform-performance-tracking.md Migration section: fetched
    // once for the whole brand, not per item, same "one extra query, not
    // N" reasoning as every other table grouped by content_id here.
    // Markdown's own Performance section reads this instead of
    // row.views/likes/comments/shares/saves now.
    supabase
      .from("content_platform_posts")
      .select(
        "id, content_id, platform, published_at, content_platform_stats_snapshots(snapshot_date, views, likes, comments, saves, shares, reposts, retention_drop_timestamp, retention_drop_note)",
      )
      .eq("brand", brand),
  ]);

  function groupByContent<T extends { content_id: string }>(rows: T[] | null): Map<string, T[]> {
    const map = new Map<string, T[]>();
    for (const row of rows ?? []) {
      const bucket = map.get(row.content_id) ?? [];
      bucket.push(row);
      map.set(row.content_id, bucket);
    }
    return map;
  }
  const titleByContent = groupByContent(titleVariants as (NonLiveVariant & { content_id: string })[]);
  const hookByContent = groupByContent(hookVariants as (NonLiveVariant & { content_id: string })[]);
  const thumbnailByContent = groupByContent(
    thumbnailVariants as (NonLiveThumbnailVariant & { content_id: string })[],
  );
  const refVideosByContent = groupByContent(
    refVideos as { content_id: string; id: string; hook_note: string | null; rehook_note: string | null; cta_note: string | null }[],
  );
  const researchCopyByContent = groupByContent(
    researchCopyVersions as (ContentArchiveCompanion["research_copy_versions"][number] & { content_id: string })[],
  );
  const scriptsByContent = groupByContent(
    scriptsVersions as (ContentArchiveCompanion["scripts_versions"][number] & { content_id: string })[],
  );
  const platformPostsByContent = groupByContent(
    (platformPostRows ?? []) as (ContentPlatformPost & { content_id: string })[],
  );

  for (const row of contentRows) {
    const itemResearchCopy = researchCopyByContent.get(row.id) ?? [];
    const itemScripts = scriptsByContent.get(row.id) ?? [];
    const itemPlatformPosts = platformPostsByContent.get(row.id) ?? [];

    const filename = filenames.get(row.id)!;
    const { webViewLink } = await upsertMarkdownFile(
      drive,
      contentFolderId,
      filename,
      buildContentCalendarMarkdown(row, itemResearchCopy, itemScripts, itemPlatformPosts),
    );
    contentLinks.set(row.id, webViewLink);

    const companion: ContentArchiveCompanion = {
      full_script: row.full_script,
      main_pointers: row.main_pointers ?? [],
      title_variants: (titleByContent.get(row.id) ?? []).map((v) => ({
        variant_text: v.variant_text,
        rank: v.rank,
        source: v.source,
        performance_rating: v.performance_rating,
      })),
      hook_variants: (hookByContent.get(row.id) ?? []).map((v) => ({
        variant_text: v.variant_text,
        rank: v.rank,
        source: v.source,
        performance_rating: v.performance_rating,
      })),
      thumbnail_variants: (thumbnailByContent.get(row.id) ?? []).map((v) => ({
        concept: v.concept,
        main_text_on_image: v.main_text_on_image,
        visual_elements: v.visual_elements,
        emotion_vibe: v.emotion_vibe,
        rank: v.rank,
        source: v.source,
        performance_rating: v.performance_rating,
      })),
      reference_videos: (refVideosByContent.get(row.id) ?? []).map((r) => ({
        id: r.id,
        hook_note: r.hook_note,
        rehook_note: r.rehook_note,
        cta_note: r.cta_note,
      })),
      research_copy_versions: itemResearchCopy.map((v) => ({
        source: v.source,
        is_live: v.is_live,
        data: v.data,
      })),
      scripts_versions: itemScripts.map((v) => ({
        source: v.source,
        is_live: v.is_live,
        data: v.data,
      })),
    };
    await upsertJsonFile(drive, contentFolderId, `${row.id}.json`, companion);
  }

  const { data: snapshots } = await supabase
    .from("research_snapshots")
    .select("id, content_id, snapshot_date, youtube_data, google_data, reddit_data, quora_data, summary")
    .eq("brand", brand);
  const snapshotRows = (snapshots ?? []) as ResearchSnapshot[];

  const topicFolderCache = new Map<string, string>();
  for (const snap of snapshotRows) {
    const title = titleById.get(snap.content_id) ?? "Untitled";
    const topicFolderName = sanitizeName(title);
    let topicFolderId = topicFolderCache.get(topicFolderName);
    if (!topicFolderId) {
      topicFolderId = await findOrCreateFolder(drive, researchFolderId, topicFolderName);
      topicFolderCache.set(topicFolderName, topicFolderId);
    }
    const dateLabel = new Date(snap.snapshot_date).toISOString().slice(0, 10);
    const { webViewLink } = await upsertMarkdownFile(
      drive,
      topicFolderId,
      `${dateLabel}.md`,
      buildResearchSnapshotMarkdown(snap, title),
    );
    snapshotLinks.set(snap.id, webViewLink);

    const researchCompanion: ResearchArchiveCompanion = {
      youtube_data: snap.youtube_data,
      google_data: snap.google_data,
      reddit_data: snap.reddit_data,
      quora_data: snap.quora_data,
    };
    await upsertJsonFile(drive, topicFolderId, `${snap.id}.json`, researchCompanion);
  }

  const { data: journeyEntries } = await supabase
    .from("journey_log")
    .select(
      "id, brand, entry_date, pillar_focus, sub_topic, what_i_did_experienced, key_lesson_insight, proof_results, mood_energy, tags_keywords, angle_worthy",
    )
    .eq("brand", brand);
  const journeyRows = (journeyEntries ?? []) as JourneyEntry[];

  const byMonth = new Map<string, JourneyEntry[]>();
  for (const entry of journeyRows) {
    const month = entry.entry_date.slice(0, 7);
    const bucket = byMonth.get(month) ?? [];
    bucket.push(entry);
    byMonth.set(month, bucket);
  }
  for (const [month, entries] of byMonth) {
    await upsertMarkdownFile(
      drive,
      journeyFolderId,
      `${month}.md`,
      buildJourneyMonthMarkdown(month, entries),
    );
  }

  return { contentLinks, snapshotLinks };
}
