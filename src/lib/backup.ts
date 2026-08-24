import { createClient as createServiceClient, type SupabaseClient } from "@supabase/supabase-js";
import { writeSheetTabs } from "@/lib/google-sheets";
import { syncDriveArchive, type DriveLinks } from "@/lib/drive-archive";
import { archiveIdleContent } from "@/lib/archive-lifecycle";
import { BRANDS, BRAND_LABELS, type Brand } from "@/lib/brand";
import { resolveGoalCurrentValues } from "@/lib/goals";
import type { ResearchCopyResult, ScriptsResult, Goal } from "@/lib/types";

type Row = (string | number | boolean | null)[];
type Tab = { title: string; headers: string[]; rows: Row[] };

function supabaseAdmin(): SupabaseClient {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function sheetIdFor(brand: Brand): string {
  const key =
    brand === "lbstransformation"
      ? "GOOGLE_SHEETS_BACKUP_ID_LBSTRANSFORMATION"
      : "GOOGLE_SHEETS_BACKUP_ID_LBSWORKS";
  const id = process.env[key];
  if (!id) throw new Error(`${key} is not configured.`);
  return id;
}

async function contentTitleMap(supabase: SupabaseClient, brand: Brand) {
  const { data } = await supabase
    .from("content_calendar")
    .select("id, final_title")
    .eq("brand", brand);
  return new Map<string, string>(
    (data ?? []).map((r: { id: string; final_title: string | null }) => [
      r.id,
      r.final_title || "Untitled",
    ]),
  );
}

function sourceCount(data: unknown) {
  if (Array.isArray(data)) return data.length;
  return data ? 1 : 0;
}

async function buildJourneyLogTab(supabase: SupabaseClient, brand: Brand): Promise<Tab> {
  const { data } = await supabase
    .from("journey_log")
    .select(
      "entry_date, pillar_focus, sub_topic, what_i_did_experienced, key_lesson_insight, proof_results, mood_energy, tags_keywords, angle_worthy",
    )
    .eq("brand", brand)
    .order("entry_date", { ascending: false });

  const rows: Row[] = (data ?? []).map((r) => [
    r.entry_date,
    (r.pillar_focus ?? []).join(", "),
    (r.sub_topic ?? []).join(", "),
    r.what_i_did_experienced,
    r.key_lesson_insight,
    r.proof_results,
    r.mood_energy,
    r.tags_keywords,
    r.angle_worthy ? "Yes" : "No",
  ]);

  return {
    title: "Journey Log",
    headers: [
      "Date",
      "Pillar",
      "Sub-topic",
      "What I Did",
      "Key Lesson",
      "Proof",
      "Mood",
      "Tags",
      "Angle-Worthy",
    ],
    rows,
  };
}

async function buildIdeasTab(supabase: SupabaseClient, brand: Brand): Promise<Tab> {
  const { data } = await supabase
    .from("ideas")
    .select("idea_title, pillar, sub_topic, format, brief_description, reference_url, status")
    .eq("brand", brand)
    .order("created_at", { ascending: false });

  const rows: Row[] = (data ?? []).map((r) => [
    r.idea_title,
    r.pillar,
    r.sub_topic,
    r.format,
    r.brief_description,
    r.reference_url,
    r.status,
  ]);

  return {
    title: "Ideas",
    headers: ["Idea Title", "Pillar", "Sub-topic", "Format", "Brief Description", "Reference URL", "Status"],
    rows,
  };
}

async function buildContentCalendarTab(
  supabase: SupabaseClient,
  brand: Brand,
  contentLinks: Map<string, string>,
): Promise<Tab> {
  const { data } = await supabase
    .from("content_calendar")
    .select(
      "id, final_title, viewer_problem, promise_outcome, pillar, sub_topic, format, platform, publish_date, production_status, viability_status, retention_drop_note, earned_the_click",
    )
    .eq("brand", brand)
    .order("publish_date", { ascending: false });

  const rows: Row[] = (data ?? []).map((r) => [
    r.final_title,
    r.viewer_problem,
    r.promise_outcome,
    r.pillar,
    r.sub_topic,
    r.format,
    (r.platform ?? []).join(", "),
    r.publish_date,
    r.production_status,
    r.viability_status,
    r.retention_drop_note,
    r.earned_the_click,
    contentLinks.get(r.id) ?? "",
  ]);

  return {
    title: "Content Calendar",
    headers: [
      "Title",
      "Viewer Problem",
      "Promise",
      "Pillar",
      "Sub-topic",
      "Format",
      "Platform",
      "Publish Date",
      "Production Status",
      "Viability Status",
      "Retention Drop",
      "Earned The Click",
      "Full Detail Link",
    ],
    rows,
  };
}

// Audit finding, fixed here: research_copy_versions/scripts_versions
// (docs/topic-page-redesign.md Section 2's real Tab 1/Tab 2 content, one
// row per source per content item, Manual and AI can coexist) had zero
// Sheets coverage since the table was created, this is the index; full
// nested detail (per-container source findings, per-short pointer
// scripts) lives in the Drive Markdown/JSON archive instead of being
// flattened into a spreadsheet cell, same division of labor as every
// other tab here.
async function buildResearchCopyVersionsTab(supabase: SupabaseClient, brand: Brand): Promise<Tab> {
  const contentTitles = await contentTitleMap(supabase, brand);
  const { data } = await supabase
    .from("research_copy_versions")
    .select("content_id, source, is_live, data")
    .eq("brand", brand);

  const rows: Row[] = (data ?? []).map((v) => {
    const d = v.data as ResearchCopyResult;
    return [
      contentTitles.get(v.content_id) ?? v.content_id,
      v.source,
      v.is_live ? "Yes" : "No",
      d.summary,
      (d.titles ?? []).join("; "),
      d.description,
      (d.keywordTags ?? []).join(", "),
      (d.questionTags ?? []).join(", "),
      (d.containers ?? []).map((c) => `${c.sourceName} (${c.type})`).join(", "),
      d.generatedAt,
    ];
  });

  return {
    title: "Research & Copy",
    headers: [
      "Content Item",
      "Source",
      "Is Live",
      "Summary",
      "Titles",
      "Description",
      "Keyword Tags",
      "Question Tags",
      "Source Containers",
      "Generated At",
    ],
    rows,
  };
}

async function buildScriptsVersionsTab(supabase: SupabaseClient, brand: Brand): Promise<Tab> {
  const contentTitles = await contentTitleMap(supabase, brand);
  const { data } = await supabase
    .from("scripts_versions")
    .select("content_id, source, is_live, data")
    .eq("brand", brand);

  const rows: Row[] = (data ?? []).map((v) => {
    const d = v.data as ScriptsResult;
    return [
      contentTitles.get(v.content_id) ?? v.content_id,
      v.source,
      v.is_live ? "Yes" : "No",
      (d.hooks ?? []).join("; "),
      d.painPointAnswer,
      d.longFormScript,
      (d.ctaOptions ?? []).join("; "),
      (d.shortFormPointers ?? []).map((p) => `${p.point}: ${p.explanation}`).join("; "),
      (d.atomizedShorts ?? []).map((s) => s.title).join(", "),
      d.generatedAt,
    ];
  });

  return {
    title: "Scripts",
    headers: [
      "Content Item",
      "Source",
      "Is Live",
      "Hooks",
      "Pain-Point Answer",
      "Long-Form Script",
      "CTA Options",
      "Short-Form Pointers",
      "Atomized Shorts",
      "Generated At",
    ],
    rows,
  };
}

async function buildVariantsTab(supabase: SupabaseClient, brand: Brand): Promise<Tab> {
  const contentTitles = await contentTitleMap(supabase, brand);

  const [{ data: titles }, { data: hooks }, { data: thumbs }] = await Promise.all([
    supabase
      .from("title_variants")
      .select("content_id, variant_text, rank, source, performance_rating, is_live")
      .eq("brand", brand),
    supabase
      .from("hook_variants")
      .select("content_id, variant_text, rank, source, performance_rating, is_live")
      .eq("brand", brand),
    supabase
      .from("thumbnail_variants")
      .select("content_id, concept, rank, source, performance_rating, is_live")
      .eq("brand", brand),
  ]);

  const rows: Row[] = [
    ...(titles ?? []).map((v) => [
      "Title",
      contentTitles.get(v.content_id) ?? v.content_id,
      v.variant_text,
      v.rank,
      v.source,
      v.performance_rating,
      v.is_live ? "Yes" : "No",
    ]),
    ...(hooks ?? []).map((v) => [
      "Hook",
      contentTitles.get(v.content_id) ?? v.content_id,
      v.variant_text,
      v.rank,
      v.source,
      v.performance_rating,
      v.is_live ? "Yes" : "No",
    ]),
    ...(thumbs ?? []).map((v) => [
      "Thumbnail",
      contentTitles.get(v.content_id) ?? v.content_id,
      v.concept,
      v.rank,
      v.source,
      v.performance_rating,
      v.is_live ? "Yes" : "No",
    ]),
  ];

  return {
    title: "Variants",
    headers: ["Variant Type", "Content Item", "Text", "Rank", "Source", "Performance Rating", "Is Live"],
    rows,
  };
}

async function buildReferenceVideosTab(supabase: SupabaseClient, brand: Brand): Promise<Tab> {
  const contentTitles = await contentTitleMap(supabase, brand);
  const { data } = await supabase
    .from("reference_videos")
    .select("content_id, url, hook_note, rehook_note, cta_note, date_added")
    .eq("brand", brand);

  const rows: Row[] = (data ?? []).map((r) => [
    contentTitles.get(r.content_id) ?? r.content_id,
    r.url,
    r.hook_note,
    r.rehook_note,
    r.cta_note,
    r.date_added,
  ]);

  return {
    title: "Reference Videos",
    headers: ["Content Item", "URL", "Hook Note", "Re-hook Note", "CTA Note", "Date Added"],
    rows,
  };
}

async function buildResearchSnapshotsTab(
  supabase: SupabaseClient,
  brand: Brand,
  snapshotLinks: Map<string, string>,
): Promise<Tab> {
  const contentTitles = await contentTitleMap(supabase, brand);
  const { data } = await supabase
    .from("research_snapshots")
    .select("id, content_id, snapshot_date, summary, youtube_data, reddit_data, quora_data")
    .eq("brand", brand);

  const rows: Row[] = (data ?? []).map((r) => [
    contentTitles.get(r.content_id) ?? r.content_id,
    r.snapshot_date,
    r.summary,
    sourceCount(r.youtube_data),
    sourceCount(r.reddit_data),
    sourceCount(r.quora_data),
    snapshotLinks.get(r.id) ?? "",
  ]);

  return {
    title: "Research Snapshots",
    headers: [
      "Content Item",
      "Snapshot Date",
      "Summary",
      "YouTube Count",
      "Reddit Count",
      "Quora Count",
      "Full Detail Link",
    ],
    rows,
  };
}

async function buildWeeklyReviewsTab(supabase: SupabaseClient, brand: Brand): Promise<Tab> {
  const { data } = await supabase
    .from("weekly_reviews")
    .select(
      "week_start_date, week_end_date, posted_as_planned, pillar_balance_notes, retention_drop_patterns, hook_library_insights, earned_click_updates, next_week_adjustment",
    )
    .eq("brand", brand)
    .order("week_start_date", { ascending: false });

  const rows: Row[] = (data ?? []).map((r) => [
    r.week_start_date,
    r.week_end_date,
    r.posted_as_planned,
    r.pillar_balance_notes,
    r.retention_drop_patterns,
    r.hook_library_insights,
    r.earned_click_updates,
    r.next_week_adjustment,
  ]);

  return {
    title: "Weekly Reviews",
    headers: [
      "Week Start",
      "Week End",
      "Posted As Planned",
      "Pillar Balance Notes",
      "Retention Drop Patterns",
      "Hook Library Insights",
      "Earned Click Updates",
      "Next Week Adjustment",
    ],
    rows,
  };
}

async function buildCompetitorsTab(supabase: SupabaseClient, brand: Brand): Promise<Tab> {
  const { data } = await supabase
    .from("competitors")
    .select("name, platform, profile_url, notes")
    .eq("brand", brand);

  const rows: Row[] = (data ?? []).map((r) => [r.name, r.platform, r.profile_url, r.notes]);

  return {
    title: "Competitors",
    headers: ["Name", "Platform", "Profile URL", "Notes"],
    rows,
  };
}

async function buildCompetitorBenchmarksTab(supabase: SupabaseClient, brand: Brand): Promise<Tab> {
  const contentTitles = await contentTitleMap(supabase, brand);
  const { data } = await supabase
    .from("competitor_benchmarks")
    .select("content_id, competitor_name, platform, url, why_benchmark")
    .eq("brand", brand);

  const rows: Row[] = (data ?? []).map((r) => [
    contentTitles.get(r.content_id) ?? r.content_id,
    r.competitor_name,
    r.platform,
    r.url,
    r.why_benchmark,
  ]);

  return {
    title: "Competitor Benchmarks",
    headers: ["Content Item", "Competitor", "Platform", "URL", "Why Benchmark"],
    rows,
  };
}

async function buildDailyStreaksTab(supabase: SupabaseClient, brand: Brand): Promise<Tab> {
  const { data } = await supabase
    .from("daily_streaks")
    .select("streak_date, walked, posted")
    .eq("brand", brand)
    .order("streak_date", { ascending: false });

  const rows: Row[] = (data ?? []).map((r) => [
    r.streak_date,
    r.walked ? "Yes" : "No",
    r.posted ? "Yes" : "No",
  ]);

  return {
    title: "Daily Streaks",
    headers: ["Date", "Walked", "Posted"],
    rows,
  };
}

// Audit finding, fixed here: platform_snapshots, custom_sub_topics,
// goals, and collaborators had zero backup coverage since creation.
// All four are flat, brand-level list tables with no nested per-item
// detail to split off to Drive, same shape as competitors/daily_streaks
// above, so Sheets-only coverage matches this file's existing division
// of labor (Drive is for content-item-linked full detail, not general
// list tables).
async function buildPlatformSnapshotsTab(supabase: SupabaseClient, brand: Brand): Promise<Tab> {
  const { data } = await supabase
    .from("platform_snapshots")
    .select("platform, follower_count, snapshot_date")
    .eq("brand", brand)
    .order("snapshot_date", { ascending: false });

  const rows: Row[] = (data ?? []).map((r) => [r.platform, r.follower_count, r.snapshot_date]);

  return {
    title: "Platform Snapshots",
    headers: ["Platform", "Follower Count", "Snapshot Date"],
    rows,
  };
}

async function buildCustomSubTopicsTab(supabase: SupabaseClient, brand: Brand): Promise<Tab> {
  const { data } = await supabase
    .from("custom_sub_topics")
    .select("pillar, sub_topic, is_archived")
    .eq("brand", brand)
    .order("pillar", { ascending: true });

  const rows: Row[] = (data ?? []).map((r) => [r.pillar, r.sub_topic, r.is_archived ? "Yes" : "No"]);

  return {
    title: "Custom Sub-topics",
    headers: ["Pillar", "Sub-topic", "Archived"],
    rows,
  };
}

// current_value is stored (and meaningful) only for old target_metric-
// based rows; platform-linked goals (platform_name set) never get it
// written anymore (src/lib/goals.ts), it's resolved live at read time
// from platform_snapshots/content_calendar instead. Recomputed here the
// same way so the backed-up number is the real current one, not a
// stale/null column value.
async function buildGoalsTab(supabase: SupabaseClient, brand: Brand): Promise<Tab> {
  const [{ data: goalRows }, { data: snapshotRows }, { data: viewRows }] = await Promise.all([
    supabase
      .from("goals")
      .select(
        "goal_text, target_metric, target_value, current_value, target_date, status, platform_name, icon_slug",
      )
      .eq("brand", brand),
    supabase
      .from("platform_snapshots")
      .select("platform, follower_count, snapshot_date")
      .eq("brand", brand)
      .order("snapshot_date", { ascending: false }),
    supabase.from("content_calendar").select("views").eq("brand", brand),
  ]);

  const latestSnapshotsByPlatform: Record<string, number> = {};
  for (const r of snapshotRows ?? []) {
    if (!(r.platform in latestSnapshotsByPlatform)) latestSnapshotsByPlatform[r.platform] = r.follower_count;
  }
  const totalViews = (viewRows ?? []).reduce((sum, r) => sum + (r.views ?? 0), 0);

  // resolveGoalCurrentValues only ever runs, live, on platform_name-not-
  // null rows (src/app/(app)/layout.tsx filters to those before calling
  // it); for any row it wasn't designed for it unconditionally nulls
  // current_value, which would silently blank out a legacy row's real
  // stored value here. Only resolve for platform-linked rows and pass
  // pre-redesign (platform_name null) rows through with their raw
  // stored current_value untouched, same "preserve what a superseded
  // field actually holds" rule this file follows elsewhere.
  const rawGoals = (goalRows ?? []) as Goal[];
  const resolved = resolveGoalCurrentValues(rawGoals, totalViews, latestSnapshotsByPlatform).map((g, i) =>
    rawGoals[i].platform_name === null ? rawGoals[i] : g,
  );

  const rows: Row[] = resolved.map((g) => [
    g.platform_name,
    g.icon_slug,
    g.status,
    g.target_value,
    g.current_value,
    g.target_date,
    g.target_metric,
    g.goal_text,
  ]);

  return {
    title: "Goals",
    headers: [
      "Platform Name",
      "Icon Slug",
      "Status",
      "Target Value",
      "Current Value",
      "Target Date",
      "Legacy Target Metric",
      "Legacy Goal Text",
    ],
    rows,
  };
}

async function buildCollaboratorsTab(supabase: SupabaseClient, brand: Brand): Promise<Tab> {
  const { data } = await supabase
    .from("collaborators")
    .select("name, platform, profile_url, status, notes, last_contact_date")
    .eq("brand", brand)
    .order("name", { ascending: true });

  const rows: Row[] = (data ?? []).map((r) => [
    r.name,
    r.platform,
    r.profile_url,
    r.status,
    r.notes,
    r.last_contact_date,
  ]);

  return {
    title: "Collaborators",
    headers: ["Name", "Platform", "Profile URL", "Status", "Notes", "Last Contact Date"],
    rows,
  };
}

type SyncResult = { ok: true } | { ok: false; error: string };

async function syncDriveOnce(brand: Brand): Promise<SyncResult & { links?: DriveLinks }> {
  const supabase = supabaseAdmin();
  try {
    const links = await syncDriveArchive(supabase, brand);
    return { ok: true, links };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function syncSheetsOnce(brand: Brand, links: DriveLinks): Promise<SyncResult> {
  const supabase = supabaseAdmin();

  try {
    const tabs = await Promise.all([
      buildJourneyLogTab(supabase, brand),
      buildIdeasTab(supabase, brand),
      buildContentCalendarTab(supabase, brand, links.contentLinks),
      buildResearchCopyVersionsTab(supabase, brand),
      buildScriptsVersionsTab(supabase, brand),
      buildVariantsTab(supabase, brand),
      buildReferenceVideosTab(supabase, brand),
      buildResearchSnapshotsTab(supabase, brand, links.snapshotLinks),
      buildWeeklyReviewsTab(supabase, brand),
      buildCompetitorsTab(supabase, brand),
      buildCompetitorBenchmarksTab(supabase, brand),
      buildDailyStreaksTab(supabase, brand),
      buildPlatformSnapshotsTab(supabase, brand),
      buildCustomSubTopicsTab(supabase, brand),
      buildGoalsTab(supabase, brand),
      buildCollaboratorsTab(supabase, brand),
    ]);

    await writeSheetTabs(sheetIdFor(brand), tabs);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

const EMPTY_LINKS: DriveLinks = { contentLinks: new Map(), snapshotLinks: new Map() };

// Section 17: two independent layers, each retried once automatically on
// failure and logged to backup_log on its own row. Sheets still runs
// even if Drive fails, just without Full Detail Links for this run,
// one layer having a bad night shouldn't take the other down with it.
export async function runBackupSync(brand: Brand) {
  const supabase = supabaseAdmin();

  let driveResult = await syncDriveOnce(brand);
  let driveRetries = 0;
  if (!driveResult.ok) {
    driveRetries = 1;
    driveResult = await syncDriveOnce(brand);
  }
  await supabase.from("backup_log").insert({
    brand,
    layer: "drive",
    status: driveResult.ok ? "success" : "failure",
    error_message: driveResult.ok ? null : driveResult.error,
    retry_count: driveRetries,
  });

  const links = driveResult.ok && driveResult.links ? driveResult.links : EMPTY_LINKS;

  let sheetsResult = await syncSheetsOnce(brand, links);
  let sheetsRetries = 0;
  if (!sheetsResult.ok) {
    sheetsRetries = 1;
    sheetsResult = await syncSheetsOnce(brand, links);
  }
  await supabase.from("backup_log").insert({
    brand,
    layer: "sheets",
    status: sheetsResult.ok ? "success" : "failure",
    error_message: sheetsResult.ok ? null : sheetsResult.error,
    retry_count: sheetsRetries,
  });

  // Section 17.4: trims Supabase last, after Sheets has already synced
  // tonight's real (pre-archive) data. Doing this earlier would make
  // freshly-archived research snapshots show 0 sources in the Sheets
  // index tonight, even though nothing was actually lost, just
  // relocated, only trims once tonight's Drive sync actually succeeded,
  // so anything cleared here is guaranteed already duplicated fresh.
  let archiveResult: { archivedIds: string[]; errors: string[] } = { archivedIds: [], errors: [] };
  if (driveResult.ok) {
    try {
      archiveResult = await archiveIdleContent(supabase, brand);
    } catch (err) {
      archiveResult = { archivedIds: [], errors: [err instanceof Error ? err.message : String(err)] };
    }
  }

  // driveResult.links (contentLinks/snapshotLinks) is internal, Map-typed
  // plumbing consumed by syncSheetsOnce above, not JSON-safe: a raw Map
  // serializes to "{}" via JSON.stringify, which made the /api/cron/backup
  // response look like Drive linking silently produced nothing even on a
  // fully successful run. Callers (the route, the status UI) only need
  // ok/error, same shape as sheetsResult.
  const driveSummary: SyncResult = driveResult.ok ? { ok: true } : { ok: false, error: driveResult.error };

  return { drive: driveSummary, sheets: sheetsResult, archive: archiveResult };
}

export async function runBackupSyncAllBrands() {
  const results = await Promise.all(BRANDS.map((brand) => runBackupSync(brand)));
  return BRANDS.map((brand, i) => ({ brand, label: BRAND_LABELS[brand], result: results[i] }));
}
