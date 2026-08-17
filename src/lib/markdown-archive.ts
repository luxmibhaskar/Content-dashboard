import type {
  ContentCalendarDetail,
  ResearchSnapshot,
  JourneyEntry,
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

// Section 17.2: "full brief: viewer problem, promise, angle, full
// script." One Markdown file per content item, readable directly in
// Drive, sections mirror the topic page's own grouping so it stays
// recognizable against the live app.
export function buildContentCalendarMarkdown(row: ContentCalendarDetail): string {
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

  parts.push(
    section("Creator Input (Internal)", [
      field("Raw idea title", row.raw_idea_title),
      field("Raw keywords / topics", row.raw_keywords_topics),
      field("Brief intent", row.brief_intent),
      field("Content angle / hook direction", row.content_angle_hook_direction),
      field("Reference / inspiration", row.reference_inspiration),
      field("Target stage (viewer journey)", row.target_stage_viewer_journey),
      field("My angle / unique POV", row.my_angle_unique_pov),
      field("Proof / credibility", row.proof_credibility),
      field("Tone / style", row.tone_style),
      field("Idea source", row.idea_source),
      field("Source detail", row.source_detail),
    ]),
  );

  parts.push(
    section("Viewer POV (Audience-Facing)", [
      field("Viewer problem", row.viewer_problem),
      field("Promise / outcome", row.promise_outcome),
      field("Final title / hook", row.final_title_hook),
      field("Viewer keywords / search phrases", row.viewer_keywords_search_phrases),
      field("Viewer description", row.viewer_description),
      field("Primary emotion / pain point", row.primary_emotion_pain_point),
      list("Objections / doubts", row.objections_doubts),
      field("Desired action / CTA", row.desired_action_cta),
      field("Format recommendation", row.format_recommendation),
    ]),
  );

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
    const blocks = Object.entries(row.platform_publishing).map(([platform, entry]) => {
      const fields = [
        field("Title", entry.platform_title),
        field("Description", entry.platform_description),
        field("Tags / hashtags", entry.platform_tags_hashtags),
        field("Angle line", entry.platform_angle_line),
      ].filter((l): l is string => Boolean(l));
      return [`### ${platform}`, ...fields].join("\n");
    });
    parts.push(`## Publishing Ready\n\n${blocks.join("\n\n")}`);
  }

  const recordingLines: (string | null)[] = [field("Energy tag", row.energy_tag)];
  if (row.main_pointers && row.main_pointers.length > 0) {
    recordingLines.push("- **Main pointers:**");
    row.main_pointers.forEach((p, i) => {
      recordingLines.push(
        `  ${i + 1}. ${p.point_text}${p.landing_line ? ` (landing line: ${p.landing_line})` : ""}${
          p.runtime_estimate_seconds ? ` [~${p.runtime_estimate_seconds}s]` : ""
        }`,
      );
    });
  }
  if (row.full_script) {
    recordingLines.push("", "**Full script:**", "", row.full_script);
  }
  if (row.voice_memo_transcript) {
    recordingLines.push("", "**Voice memo transcript:**", "", row.voice_memo_transcript);
  }
  parts.push(section("Recording Section", recordingLines));

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

  parts.push(
    section("Performance", [
      field("Views", row.views),
      field("Likes", row.likes),
      field("Comments", row.comments),
      field("Shares", row.shares),
      field("Saves", row.saves),
      field("Conversions", row.conversions),
    ]),
  );

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
