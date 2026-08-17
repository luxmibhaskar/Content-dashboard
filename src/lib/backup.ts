import { createClient as createServiceClient, type SupabaseClient } from "@supabase/supabase-js";
import { writeSheetTabs } from "@/lib/google-sheets";
import { BRANDS, BRAND_LABELS, type Brand } from "@/lib/brand";

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

async function buildContentCalendarTab(supabase: SupabaseClient, brand: Brand): Promise<Tab> {
  const { data } = await supabase
    .from("content_calendar")
    .select(
      "final_title, viewer_problem, promise_outcome, pillar, sub_topic, format, platform, publish_date, production_status, viability_status, retention_drop_note, earned_the_click",
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
    "", // Full Detail Link: points into the Drive archive, Phase 2 (Section 17.2)
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

async function buildResearchSnapshotsTab(supabase: SupabaseClient, brand: Brand): Promise<Tab> {
  const contentTitles = await contentTitleMap(supabase, brand);
  const { data } = await supabase
    .from("research_snapshots")
    .select("content_id, snapshot_date, summary, youtube_data, reddit_data, quora_data")
    .eq("brand", brand);

  const rows: Row[] = (data ?? []).map((r) => [
    contentTitles.get(r.content_id) ?? r.content_id,
    r.snapshot_date,
    r.summary,
    sourceCount(r.youtube_data),
    sourceCount(r.reddit_data),
    sourceCount(r.quora_data),
    "", // Full Detail Link: raw pull lives in the Drive archive, Phase 2
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

async function syncBrandOnce(brand: Brand): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = supabaseAdmin();

  try {
    const tabs = await Promise.all([
      buildJourneyLogTab(supabase, brand),
      buildIdeasTab(supabase, brand),
      buildContentCalendarTab(supabase, brand),
      buildVariantsTab(supabase, brand),
      buildReferenceVideosTab(supabase, brand),
      buildResearchSnapshotsTab(supabase, brand),
      buildWeeklyReviewsTab(supabase, brand),
      buildCompetitorsTab(supabase, brand),
      buildCompetitorBenchmarksTab(supabase, brand),
      buildDailyStreaksTab(supabase, brand),
    ]);

    await writeSheetTabs(sheetIdFor(brand), tabs);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// Section 17: retry once automatically on failure, log every attempt to
// backup_log, surface a warning only after two consecutive failures.
export async function runBackupSync(brand: Brand) {
  const supabase = supabaseAdmin();

  let result = await syncBrandOnce(brand);
  let retryCount = 0;

  if (!result.ok) {
    retryCount = 1;
    result = await syncBrandOnce(brand);
  }

  await supabase.from("backup_log").insert({
    brand,
    layer: "sheets",
    status: result.ok ? "success" : "failure",
    error_message: result.ok ? null : result.error,
    retry_count: retryCount,
  });

  return result;
}

export async function runBackupSyncAllBrands() {
  const results = await Promise.all(BRANDS.map((brand) => runBackupSync(brand)));
  return BRANDS.map((brand, i) => ({ brand, label: BRAND_LABELS[brand], result: results[i] }));
}
