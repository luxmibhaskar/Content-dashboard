import fs from "fs";
import path from "path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getDriveClient, findOrCreateFolder, upsertMarkdownFile } from "@/lib/google-drive";
import {
  buildContentCalendarMarkdown,
  buildResearchSnapshotMarkdown,
  buildJourneyMonthMarkdown,
} from "@/lib/markdown-archive";
import type { Brand } from "@/lib/brand";
import type { ContentCalendarDetail, ResearchSnapshot, JourneyEntry } from "@/lib/types";

function rootFolderIdFor(brand: Brand): string {
  const key =
    brand === "lbstransformation"
      ? "GOOGLE_DRIVE_BACKUP_FOLDER_ID_LBSTRANSFORMATION"
      : "GOOGLE_DRIVE_BACKUP_FOLDER_ID_LBSWORKS";
  const id = process.env[key];
  if (!id) throw new Error(`${key} is not configured.`);
  return id;
}

function sanitizeName(name: string): string {
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

  for (const row of contentRows) {
    const { webViewLink } = await upsertMarkdownFile(
      drive,
      contentFolderId,
      filenames.get(row.id)!,
      buildContentCalendarMarkdown(row),
    );
    contentLinks.set(row.id, webViewLink);
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
