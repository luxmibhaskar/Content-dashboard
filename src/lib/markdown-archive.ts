import type {
  ContentCalendarDetail,
  ContentPlatformPost,
  ResearchSnapshot,
  JourneyEntry,
  ResearchCopyResult,
  ScriptsResult,
  VersionSource,
} from "@/lib/types";

function section(title: string, lines: (string | null | undefined | false)[]): string {
  const body = lines.filter((l): l is string => Boolean(l && l.trim().length > 0));
  if (body.length === 0) return "";
  return `## ${title}\n\n${body.join("\n")}\n`;
}

function field(label: string, value: string | number | boolean | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  return `- **${label}:** ${value}`;
}

function list(label: string, values: string[] | null | undefined): string | null {
  if (!values || values.length === 0) return null;
  return `- **${label}:** ${values.join(", ")}`;
}

function sourceLabel(source: VersionSource, isLive: boolean): string {
  return `${source === "manual" ? "Manual" : "AI"}${isLive ? " (Active)" : ""}`;
}

// docs/platform-performance-tracking.md Migration section: one block per
// platform this item was actually posted to, each showing its latest
// check-in (same "most recent logged count wins" rule as
// src/lib/platform-analytics.ts), replacing the old flat Views/Likes/
// Comments/Shares/Saves fields this section used to read straight off
// content_calendar. conversions stays a flat field, the new tables have
// no equivalent for it.
function buildPerformanceSection(posts: ContentPlatformPost[], conversions: number | null): string {
  const platformBlocks = posts.map((p) => {
    const latest = [...p.content_platform_stats_snapshots].sort((a, b) =>
      b.snapshot_date.localeCompare(a.snapshot_date),
    )[0];
    const lines = [
      field("Posted", new Date(p.published_at).toLocaleString()),
      field("Latest check-in", latest?.snapshot_date),
      field("Views", latest?.views),
      field("Likes", latest?.likes),
      field("Comments", latest?.comments),
      field("Saves", latest?.saves),
      field("Shares", latest?.shares),
      field("Reposts", latest?.reposts),
      // Analytics audit (2026-08-27) Phase 3: one reading per check-in
      // now (src/lib/retention-drop.ts), same latest-snapshot-wins rule
      // as every other field in this block.
      field("Retention drop", latest?.retention_drop_timestamp),
      field("Retention drop note", latest?.retention_drop_note),
    ].filter((l): l is string => Boolean(l));
    return [`### ${p.platform}`, ...lines].join("\n");
  });

  const body = [...platformBlocks, field("Conversions", conversions)].filter((s): s is string => Boolean(s));
  if (body.length === 0) return "";
  return `## Performance\n\n${body.join("\n\n")}\n`;
}

// docs/topic-page-redesign.md Section 2, Tab 1: the real replacement for
// the old research_snapshots-driven pipeline this file used to archive
// under "Creator Input"/"Viewer POV". Both Manual and AI versions,
// whichever exist, rendered in full (this file is the disaster-recovery
// copy, not a preview, no truncation).
function buildResearchCopyBlock(v: { source: VersionSource; is_live: boolean; data: ResearchCopyResult }): string {
  const d = v.data;
  const lines: string[] = [`### ${sourceLabel(v.source, v.is_live)}`, ""];

  if (d.summary) lines.push(d.summary, "");

  if (d.globalSources?.length > 0) {
    lines.push("**Sources:**");
    d.globalSources.forEach((s) => lines.push(`- [${s.title}](${s.url})`));
    lines.push("");
  }

  if (d.titles?.length > 0) {
    lines.push("**Titles:**");
    d.titles.forEach((t, i) => lines.push(`${i + 1}. ${t}`));
    lines.push("");
  }

  if (d.description) lines.push("**Description:**", "", d.description, "");

  if (d.keywordTags?.length > 0) lines.push(`- **Keyword tags:** ${d.keywordTags.join(", ")}`);
  if (d.questionTags?.length > 0) lines.push(`- **Question tags:** ${d.questionTags.join(", ")}`);

  if (d.containers?.length > 0) {
    lines.push("", "**Source findings:**", "");
    d.containers.forEach((c) => {
      lines.push(`#### ${c.sourceName} (${c.type === "discussion" ? "Discussion" : "Article"})`);
      if (c.type === "discussion") (c.items ?? []).forEach((item) => lines.push(`- ${item}`));
      if (c.type === "article" && c.articleSummary) lines.push(c.articleSummary);
      if (c.sources.length > 0) {
        lines.push("Links:");
        c.sources.forEach((s) => lines.push(`- [${s.title}](${s.url})`));
      }
      lines.push("");
    });
  }

  return lines.join("\n").replace(/\n+$/, "");
}

function buildResearchCopySection(versions: { source: VersionSource; is_live: boolean; data: ResearchCopyResult }[]): string {
  if (versions.length === 0) return "";
  return `## Research & Copy\n\n${versions.map(buildResearchCopyBlock).join("\n\n")}`;
}

// docs/topic-page-redesign.md Section 2, Tab 2: the real replacement for
// this file's old "Recording Section" (full_script/main_pointers, the
// pre-redesign single-script fields, still archived separately below
// since archiveOneItem still clears them, but they're not what the
// current Scripts tab actually produces anymore).
function buildScriptsBlock(v: { source: VersionSource; is_live: boolean; data: ScriptsResult }): string {
  const d = v.data;
  const lines: string[] = [`### ${sourceLabel(v.source, v.is_live)}`, ""];

  if (d.hooks?.length > 0) {
    lines.push("**Hooks:**");
    d.hooks.forEach((h, i) => lines.push(`${i + 1}. ${h}`));
    lines.push("");
  }

  if (d.painPointAnswer) lines.push("**Pain-point answer:**", "", d.painPointAnswer, "");
  if (d.longFormScript) lines.push("**Long-form script:**", "", d.longFormScript, "");

  if (d.ctaOptions?.length > 0) {
    lines.push("**CTA options:**");
    d.ctaOptions.forEach((c, i) => lines.push(`${i + 1}. ${c}`));
    lines.push("");
  }

  if (d.shortFormPointers?.length > 0) {
    lines.push("**Short-form pointers:**");
    d.shortFormPointers.forEach((p) => lines.push(`- ${p.point}${p.explanation ? `: ${p.explanation}` : ""}`));
    lines.push("");
  }

  if (d.atomizedShorts?.length > 0) {
    lines.push("**Atomized shorts:**", "");
    d.atomizedShorts.forEach((s, i) => {
      lines.push(`#### Short ${i + 1}: ${s.title}`);
      s.pointerScript.forEach((p) => lines.push(`- ${p.point}${p.explanation ? `: ${p.explanation}` : ""}`));
      lines.push("");
    });
  }

  return lines.join("\n").replace(/\n+$/, "");
}

function buildScriptsSection(versions: { source: VersionSource; is_live: boolean; data: ScriptsResult }[]): string {
  if (versions.length === 0) return "";
  return `## Scripts\n\n${versions.map(buildScriptsBlock).join("\n\n")}`;
}

// Section 17.2: "full brief: viewer problem, promise, angle, full
// script." One Markdown file per content item, readable directly in
// Drive, sections mirror the topic page's own grouping so it stays
// recognizable against the live app. researchCopyVersions/
// scriptsVersions replace the old Creator Input/Viewer POV/Recording
// Section blocks this file used to build (docs/topic-page-redesign.md
// Section 2 removed those from the UI entirely; this file just hadn't
// caught up), those tables are where the topic page's real Research &
// Copy and Scripts tab content actually lives now.
// docs/platform-performance-tracking.md Migration section: platformPosts
// replaces row.views/likes/comments/shares/saves in the Performance
// section below - conversions is the one field that stays reading off
// row directly, the new tables have no equivalent for it (see
// src/lib/platform-analytics.ts's own comment on why).
export function buildContentCalendarMarkdown(
  row: ContentCalendarDetail,
  researchCopyVersions: { source: VersionSource; is_live: boolean; data: ResearchCopyResult }[],
  scriptsVersions: { source: VersionSource; is_live: boolean; data: ScriptsResult }[],
  platformPosts: ContentPlatformPost[],
): string {
  const title = row.final_title || row.raw_idea_title || "Untitled";
  const parts: string[] = [`# ${title}`];

  parts.push(
    section("Status", [
      field("Production status", row.production_status),
      field("Viability status", row.viability_status),
      field("Viability reason", row.viability_reason_note),
      field("Pillar", row.pillar),
      field("Sub-topic", row.sub_topic),
      field("Format", row.format),
      list("Platform", row.platform_publishing ? Object.keys(row.platform_publishing) : null),
      field("Publish date", row.publish_date),
    ]),
  );

  parts.push(buildResearchCopySection(researchCopyVersions));
  parts.push(buildScriptsSection(scriptsVersions));

  parts.push(
    section("Copy-Ready Panel", [
      field("Final description", row.final_description),
      list("Plain keyword tags", row.plain_keyword_tags),
      list("Question-style tags", row.question_style_tags),
      list("Core tags", row.core_tags),
      list("Detailed viewer search phrase tags", row.detailed_viewer_search_phrase_tags),
    ]),
  );

  if (row.platform_publishing && Object.keys(row.platform_publishing).length > 0) {
    const modeFields = (mode?: { title?: string; description?: string; short_keywords?: string; question_keywords?: string; angle_line?: string }) =>
      [
        field("Title", mode?.title ?? null),
        field("Description", mode?.description ?? null),
        field("Short keywords", mode?.short_keywords ?? null),
        field("Question keywords", mode?.question_keywords ?? null),
        field("Angle line", mode?.angle_line ?? null),
      ].filter((l): l is string => Boolean(l));

    const blocks = Object.entries(row.platform_publishing).map(([platform, entry]) => {
      const viewerFields = modeFields(entry.viewer_pov);
      const normalFields = modeFields(entry.normal_pov);
      const sections = [
        viewerFields.length > 0 ? ["**Viewer POV**", ...viewerFields].join("\n") : null,
        normalFields.length > 0 ? ["**Normal POV**", ...normalFields].join("\n") : null,
      ].filter((s): s is string => Boolean(s));
      return [`### ${platform}`, ...sections].join("\n\n");
    });
    parts.push(`## Publishing Ready\n\n${blocks.join("\n\n")}`);
  }

  parts.push(
    section("System & Production", [
      field("Sequence step", row.sequence_step),
      field("Sequence order (custom)", row.sequence_order_custom),
      field("Evidence condition", row.evidence_condition),
      field("Script / outline link", row.script_outline_link),
      field("Published URL", row.published_url),
      field("Performance notes", row.performance_notes),
      field("Series / playlist", row.series_playlist),
      field("Search demand / trend signal", row.search_demand_trend_signal),
      field("Success metric focus", row.success_metric_focus),
      list("Follow-up content ideas", row.follow_up_content_ideas),
      field("Analytics review date", row.analytics_review_date),
      field("Retention drop timestamp", row.retention_drop_timestamp),
      field("Retention drop note", row.retention_drop_note),
      field("Earned the click", row.earned_the_click),
      field("Earned click note", row.earned_click_note),
    ]),
  );

  parts.push(buildPerformanceSection(platformPosts, row.conversions));

  return parts
    .filter((p) => p.trim().length > 0)
    .map((p) => p.replace(/\n+$/, ""))
    .join("\n\n");
}

// Section 17.2: "full readable research pull for that date." Same raw
// data the Research tab renders, formatted as Markdown instead of a UI.
export function buildResearchSnapshotMarkdown(row: ResearchSnapshot, contentTitle: string): string {
  const parts: string[] = [
    `# Research pull: ${contentTitle}`,
    "",
    `**Date:** ${new Date(row.snapshot_date).toLocaleString()}`,
    "",
  ];

  if (row.summary) parts.push(`> ${row.summary}`, "");

  const youtube = row.youtube_data ?? [];
  if (youtube.length > 0) {
    parts.push("## YouTube", "");
    for (const v of youtube) {
      parts.push(`### ${v.title}`);
      parts.push(`${v.channelTitle}${v.viewCount !== null ? `, ${v.viewCount.toLocaleString()} views` : ""}, ${v.url}`);
      if (v.description) parts.push("", v.description);
      if (v.topComments.length > 0) {
        parts.push("", "**Top comments:**");
        v.topComments.forEach((c) => parts.push(`- ${c}`));
      }
      parts.push("");
    }
  }

  const google = row.google_data;
  if (google && (google.autocomplete.length > 0 || google.peopleAlsoAsk.length > 0 || google.relatedSearches.length > 0)) {
    parts.push("## Google", "");
    if (google.autocomplete.length > 0) {
      parts.push("**Autocomplete:**", google.autocomplete.map((s) => `- ${s}`).join("\n"), "");
    }
    if (google.peopleAlsoAsk.length > 0) {
      parts.push("**People Also Ask:**");
      google.peopleAlsoAsk.forEach((q) => parts.push(`- ${q.question}${q.snippet ? `: ${q.snippet}` : ""}`));
      parts.push("");
    }
    if (google.relatedSearches.length > 0) {
      parts.push("**Related searches:**", google.relatedSearches.map((s) => `- ${s}`).join("\n"), "");
    }
  }

  const reddit = row.reddit_data ?? [];
  if (reddit.length > 0) {
    parts.push("## Reddit", "");
    reddit.forEach((r) => {
      parts.push(`- [${r.title}](${r.link})${r.snippet ? `: ${r.snippet}` : ""}`);
    });
    parts.push("");
  }

  const quora = row.quora_data ?? [];
  if (quora.length > 0) {
    parts.push("## Quora", "");
    quora.forEach((q) => {
      parts.push(`- [${q.title}](${q.link})${q.snippet ? `: ${q.snippet}` : ""}`);
    });
    parts.push("");
  }

  return parts.join("\n");
}

// Section 17.2: "longer Journey Log entries, batched by month." One file
// per month, regenerated whole on each sync so it always reflects every
// entry currently in that month, not an append-only log of partial
// writes.
export function buildJourneyMonthMarkdown(monthLabel: string, entries: JourneyEntry[]): string {
  const parts: string[] = [`# Journey Log: ${monthLabel}`, ""];

  const sorted = [...entries].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  for (const e of sorted) {
    parts.push(`## ${e.entry_date}`, "");
    parts.push(
      [
        list("Pillar focus", e.pillar_focus),
        list("Sub-topic", e.sub_topic),
        field("What I did / experienced", e.what_i_did_experienced),
        field("Key lesson / insight", e.key_lesson_insight),
        field("Proof / results", e.proof_results),
        field("Mood / energy", e.mood_energy),
        field("Tags / keywords", e.tags_keywords),
        field("Angle-worthy", e.angle_worthy ? "Yes" : "No"),
      ]
        .filter((l): l is string => Boolean(l))
        .join("\n"),
    );
    parts.push("");
  }

  return parts.join("\n");
}
