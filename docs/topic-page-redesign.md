# Topic Page Redesign Spec

This is the current, correct, complete design for the Content Calendar's
"+ New" flow and topic page. It supersedes the original 10.1.1-10.1.6
section structure entirely. Read this in full before building, this is a
real replacement, not an addition alongside what exists.

## 0. Production status taxonomy (also superseded from builder-brief.md)

Replaces the original 6-stage tracker (Idea, Scripting, Filming, Editing,
Scheduled, Published) with 4 stages: **Ready to Record / Scripted,
Recorded, Editing, Published / Scheduled**.

Items with no production_status yet (freshly captured ideas, still in
research, not yet transferred to the Calendar) have `production_status =
null` and do not render as Calendar cards at all. They stay visible and
workable from the Idea Panel only. The first real status gets set, and
the item first appears as a Calendar card, when a "Transfer to Calendar"
action fires.

## 0.5. Calendar card layout (List View, `src/components/calendar-list.tsx`)

Confirmed spec, previously only decided in conversation and referenced
in code by a comment citing a "Section 19" that doesn't actually cover
this (Section 19 of `builder-brief.md` is the Build Phases list) — this
section is that spec's real home now. Refines `builder-brief.md`
Section 10.0's four-things list with the actual spatial layout:

- **Top-left**: Title (one line, truncated). (Viability Status dot
  retired 2026-08-27, Production Status already conveys workability;
  see Section 9's 2026-08-27 update below.)
- **Second row**: the pillar-colored tag (`src/components/pillar-tag.tsx`,
  `docs/brand-tokens.md`'s Tag styling), plus the sub-topic as plain
  text next to it, plus an "Archived" badge when applicable.
- **Bottom, horizontally centered**: the production status bar
  (`src/components/production-status-bar.tsx`, `mx-auto w-4/5`,
  intensity increases with pipeline stage), pushed to the card's bottom
  edge via `mt-auto` regardless of how much the rows above it take up.

Items with `production_status = null` (Idea-stage, not yet transferred
to the Calendar) never reach this list at all (filtered in
`calendar/page.tsx`), so "the full production status range" a card can
show is only the 4 real stages above, idea-stage is a Idea Panel-only
concept, not a 5th card stage.

## 1. "+ New" content item form

**⚠ Superseded, see `docs/manual-workflow-redesign.md`.** The two-
entry-point version this section originally described (a condensed
Title/Brief Description/Keywords form on one side, a paste-first,
create-on-successful-parse flow on the other, `/calendar/new` with an
`?entry=manual` branch) is gone. Once both the Manual and AI sides
gained their own Research phase with that same input already collected
there (Manual's per `manual-workflow-redesign.md`, AI's own reorganized
onto the same three-phase structure), collecting it a second time
before the item even existed became pure duplication, and the old
Manual entry point's premise (create the item only once a paste parses,
title from that parse) had nothing left to defer creation on, since no
paste happens before the item exists anymore either way.

Now: a single "+ New" button on the Content Calendar page
(`createBlankContentItem`, `src/app/(app)/calendar/actions.ts`). No
form, no route to visit first. It inserts a blank `content_calendar`
row with a literal `"Untitled"` title (not left null: an empty header
on a row that's already real underneath reads as broken, not as "not
polished yet", same reasoning the Idea Panel's `ensureMigrated` already
established) and redirects straight to that item's topic page.
`TopicPageTabs` already defaults every topic page to the AI area
regardless of how the item was created, so landing there needs no entry
param, it's already where things land. The creator fills in a real
title however they'd fill in any other field on a freshly created
item: typing directly into the always-editable Title field, or, on the
AI side, clicking "Use This" once Research/Packaging has generated
title options.

## 2. Topic page: three tabs, not five sections

**⚠ Updated twice.** Originally exactly two tabs (Research & Copy,
Scripts). Reference Videos (builder-brief.md Section 10.2.1) became a
third, same pill styling, added after the original two-tab build; it
was never meant to be cut, it just went silently unwired for a stretch
and has since been restored. See Tab 3 below.

**⚠ Restructured twice since, see `docs/manual-workflow-redesign.md`.**
The flat three-tab pill this section describes no longer exists in
either form. Top level is a Manual/AI toggle (same pill styling) plus
Reference Videos alongside it, since Reference Videos belongs to
neither side, not a third flat tab:

- **AI** (selected by default): the same phase-gated Research/
  Packaging/Scripting pill switcher Manual uses (see below), applied to
  the AI side's own content in a later reorganization pass. Tab 1
  "Research & Copy"'s content is split across two phases: Research shows
  summary/sources/competitor-coverage, Packaging shows titles/
  description/tags, both from the same single `runResearchAndCopy` call
  (or paste) as before, no new generation, no new cost, gating and
  display just reorganized. Tab 2 "Scripts" becomes the Scripting phase
  verbatim, unchanged, it already matched 1:1. No AI-generated thumbnail
  suggestions exist anywhere in this pipeline, unlike Manual's Packaging
  phase which has them from its own template; the AI Packaging phase
  omits thumbnails rather than fabricate a new generation call.
- **Manual**: the phase-gated Research/Packaging/Scripting workflow,
  replacing the Manual paste-panel that used to sit side by side with AI
  inside Tab 1/Tab 2 (still there as of this note, removing it is a
  separate pending decision, not yet done). Full spec in
  `docs/manual-workflow-redesign.md`.
- **Reference Videos**: unchanged, still Tab 3 as described below, just
  positioned alongside the Manual/AI toggle now instead of inside the
  same flat pill as Tab 1/Tab 2.

Remove entirely as separate sections: Creator Input, Audience Strategy,
Viewer POV, Normal POV, Recording Section. Replace with tabs styled
visually like the existing brand-switcher pill toggle, not a plain tab
bar.

Remove the old separate `/calendar/[id]/research` subpage and its
"Research (N) →" breadcrumb entirely. Research now lives inside Tab 1 on
this same page.

### Tab 1: "Research & Copy"

First "Run" triggers the full deep research pass immediately, there is no
separate shallow-then-deep step, one Run, full depth from the start.

Structure, top to bottom:

1. **Summary**: roughly 1000+ words, clean easy-to-read prose, genuinely
   readable, not an AI-formatted list. No em dashes anywhere in it, no
   AI-feeling phrasing or symbols. **No markdown syntax of any kind**, no
   `#`/`##` headers, no `**bold**`, no `[text](url)` bracketed links, no
   blockquote-style isolated quotes with a citation floating alone on its
   own line. Citations get woven naturally into the sentence itself
   (e.g. "a 2025 Lancet review found..." or "...according to UCLA
   Health"), never broken out as a separate quoted fragment followed by a
   dangling source link. This should read as continuous, real prose
   start to finish, the kind a person would actually enjoy reading, not
   a structured research report with headers and citation blocks.
2. **Sources** (global): collapsible, collapsed by default, directly
   below the summary. Contains the links the summary drew from. This is
   separate from the per-container sources described below.
3. **Titles**: 3 options.
4. **Description**: 1, under roughly 300 words, covers main points with
   brief explanation, not padded.
5. **Tags**: keyword tags and question tags, each in its own separate
   container.
6. **Source containers**: dynamic, not fixed to Google/Reddit/Quora.
   Whatever sources actually surface genuinely useful results get their
   own container, could be a forum, a news article, YouTube, anything
   relevant. Two container types:
   - **Discussion-style** (Reddit, Quora, forums): questions, comments,
     suggestions, pain points found there. If one source surfaces
     multiple distinct items, they live together in that one container,
     separated by dividers, not as separate containers per item.
   - **Article-style** (news, blog posts): a roughly 500-word summary of
     that specific piece, same clean-prose rules as the main summary.
   Every container, either type, gets its own collapsible "Sources"
   sub-section directly below it, collapsed by default, linking to the
   specific thread, comment, post, or article it came from. This is
   distinct from the one global Sources section under the main summary.

Every piece of research included should be genuinely useful for the
specific topic, not generic filler included to fill a section.

### Tab 2: "Scripts"

Empty by default. Only generates when this tab is opened and its own
separate "Run" is tapped, distinct from Tab 1's Run.

Structure: 3 opening hook options at the top, then the main script body,
then a few CTA options at the end.

Content focus: the script's main points should specifically address the
recurring pain points and questions surfaced in Tab 1's research. The
goal is a viewer feeling like this is exactly what they were searching
for, genuinely relieved and thankful, not just information covered for
its own sake.

Short-form specifically: since these become individual 30-60 second
videos, generate multiple distinct scripts when the topic supports it,
each a complete, self-contained video, living within one container,
separated from each other by dividers, same visual pattern as the source
containers in Tab 1.

### Tab 3: "Reference Videos"

Full spec lives in builder-brief.md Section 10.2.1, unaffected by this
doc otherwise, this entry just records that it's a tab on this same page
alongside Tab 1 and Tab 2, not a separate route.

## 3. Navigation cleanup

**⚠ Partially superseded, see `docs/dashboard-redesign.md`.** The top
bar itself is accurate below, but the Command Center redesign moved
Journey Log out of "More" and into its own sidebar widget on the
renamed Dashboard page, and later added Platforms to "More" alongside
Collaborators.

- Personal Angle Bank: not a separate nav item, it's a toggle inside
  Journey Log.
- Quick Capture: not a separate nav item, replaced by the Dashboard-page
  quick-entry box (below).
- Journey Log and Collaborators: move into a "More" overflow menu, the
  main top bar has gotten crowded.

## 4. Dashboard page quick-entry box

**⚠ Superseded, see `docs/dashboard-redesign.md`.** No longer its own
centered block below streak/goals, a later layout follow-up moved it
into the Journey Log sidebar widget itself (fixed at the top of that
card, above the scrollable entry list). Also renamed from "Today" to
"Dashboard" (top-bar label and page heading only, same route and
content).

A text-entry area on the Dashboard page. Whatever gets typed and saved
here goes automatically and directly into Journey Log, no destination
picker, no migration step.

## 5. Competitors auto-population

Whenever research or Deep Research surfaces competitor information, it
should automatically populate into the existing Competitors section,
arranged chronologically as the calendar gets built out over time, not
manually added after the fact.

## 6. Visual bar

- Containers and text-entry areas should not run full-bleed stretched by
  default, tighten to comfortable, intentional proportions.
- Add a dark mode / light mode toggle. Both modes should feel like a
  genuinely premium product, not default flat light UI, real depth and
  intentional restraint, applied consistently to every container, button,
  and interactive element, not just a color swap.

## 7. "Paste from AI chat" import

Confirmed spec, real feature that was discussed and approved but never
made it into a doc file until now, a gap deliberately closed here so it
can't happen a second time. Free, pattern-based text parsing against the
templates below, genuinely no Claude API call either way, matching the
existing "Run" pipeline's field structure
(`ResearchCopyResult`/`ScriptsResult`, `src/lib/types.ts`) exactly, so a
paste-imported topic is indistinguishable from a Run-produced one once
saved.

**Where it lives**: a collapsed "Paste from AI chat +" toggle inside the
existing Run card on both Tab 1 (Research & Copy) and Tab 2 (Scripts),
next to Run/Run Again, not a separate section.

**Parser**: `src/lib/paste-import.ts`, `parseResearchCopyPaste` and
`parseScriptsPaste`. Pure functions, no server-only imports, splits the
pasted text on known header lines (case-insensitive, optional `#`/`##`/
`###` prefix, optional trailing colon, each on its own line) and
sub-parses each section's content.

Research & Copy template, headers in this order:
```
SUMMARY
<prose>

SOURCES
Title - https://...
Title - https://...

TITLES
1. Title option
2. Title option

DESCRIPTION
<prose>

KEYWORD TAGS
tag one
tag two

QUESTION TAGS
question one
question two

SOURCE FINDINGS          (optional)
### Source Name (Discussion)
bullet point
bullet point
Links:
Title - https://...

### Source Name (Article)
<prose summary>
Links:
Title - https://...
```
The nested per-container link list is deliberately labeled `Links:`,
not `Sources:` — a same-named nested marker would falsely re-trigger the
top-level `SOURCES` header match anywhere it appeared in the document
(this was a real bug caught in testing: it silently truncated and
overwrote the real global sources list with just the fragment collected
after the last nested `Sources:` line).

Scripts template, headers in this order:
```
HOOKS
1. Hook
2. Hook

PAIN-POINT ANSWER
<one line/paragraph>

LONG-FORM SCRIPT
<prose>

CTA OPTIONS
1. CTA
2. CTA

SHORT-FORM POINTERS
Point: <text> | Explanation: <text>
Point: <text> | Explanation: <text>

ATOMIZED SHORTS          (optional)
### Short 1: <title>
Point: <text> | Explanation: <text>

### Short 2: <title>
Point: <text> | Explanation: <text>
```

**Confidence gate, no partial guessing**: each parser requires every
core header present (SOURCE FINDINGS and ATOMIZED SHORTS are the only
optional ones) and requires the primary fields to be non-empty (summary/
titles/description for research, hooks/pain-point answer/long-form
script/CTA options/short-form pointers for scripts). Missing any of
these returns `null` rather than saving a partial or misrouted result.
On `null`, the tab shows the exact raw pasted text back in an editable
textarea with an inline message ("Couldn't confidently match the
template structure...") instead of auto-filling anything, so the
creator can fix formatting and retry or copy pieces out manually.

**Textarea reset behavior**: the textarea is keyed off the action's
returned `fallbackRaw` value (`src/components/paste-import-section.tsx`)
rather than left as a bare uncontrolled field. React automatically
resets uncontrolled fields inside an action-bound `<form>` once the
action settles, success or failure alike, so a naive uncontrolled
textarea would lose exactly the raw text the fallback path is supposed
to preserve. This was also caught and fixed in testing.

**Save path**: parsing happens server-side
(`importResearchCopyPaste`/`importScriptsPaste`,
`src/app/(app)/calendar/[id]/research-copy-actions.ts` and
`scripts-actions.ts`), and on a confident parse both actions write
through `upsertVersionAndAutoActivate` (`src/lib/content-versions.ts`),
the same shared helper Run itself uses, just with `source: "manual"`
instead of `"ai"` — see Section 8 below for what that actually writes
to and why. For Research & Copy, every save (Manual or AI alike) also
runs Competitor auto-population (Section 5), scanning that version's
own text, no separate path that could silently skip it. Verified live: a
well-formed paste with a known competitor's name in the summary
correctly surfaced an auto-populated Competitor Benchmark, exactly as a
real Run would.

## 8. Manual and AI research/scripts coexist per item

Confirmed spec: a Manual (pasted) version and an AI (Run) version exist
side by side per content item, for both Research & Copy and Scripts,
one never overwrites the other. Reuses the `is_live` pattern already
proven at the schema level by `title_variants`/`hook_variants`/
`thumbnail_variants` (`supabase/migrations/0001_init.sql`): a partial
unique index enforcing at most one `is_live = true` row per content
item. Unlike those tables, this is the first place that pattern actually
gets a working "mark active" UI, `title_variants` etc. never had one,
they're read-only outside of Hook Library/Analytics and the archive
lifecycle.

**Schema** (`supabase/migrations/0015_research_copy_scripts_versions.sql`):
two new tables, `research_copy_versions` and `scripts_versions`, each
`(id, content_id, brand, source, data jsonb, is_live, created_at,
updated_at)`, `source` is `'manual' | 'ai'`. A partial unique index on
`(content_id) where is_live` enforces the one-active-version rule; a
plain unique index on `(content_id, source)` keeps the existing
"regenerated wholesale each time, no history" convention, just scoped
per source now — re-running AI overwrites only the AI row, re-pasting
Manual overwrites only the Manual row, via
`upsertVersionAndAutoActivate` (`src/lib/content-versions.ts`), shared
by both actions files for both tables. The old single-blob
`content_calendar.research_copy`/`.scripts` columns are gone, migrated
into the new tables as the `'ai'` source (all pre-existing data came
from Run, Paste didn't exist before this) and set active, so every
existing item's visible behavior is unchanged until someone adds a
Manual version alongside it.

**Auto-activate, once, never silently reassigned**: a brand-new item's
first version, of either source, becomes active automatically (nothing
else for it to be). Saving a second version, or re-saving an existing
one, never changes which version is active, that's a deliberate choice
via "Make active" (`setActiveResearchCopyVersion`/
`setActiveScriptsVersion`), the same radio-exclusive toggle for both
tables (`setActiveVersion` in `content-versions.ts`), two sequential
updates (unset the current active row, then set the target one), not a
single atomic transaction — this app has no multi-statement transaction
API wired up anywhere, and doesn't need one for a single-user tool with
no concurrent writers to race against.

**Downstream behavior, decided explicitly rather than assumed**:
- **Scripts' Run reads whichever research_copy_versions row is
  currently active, full stop.** Not always the AI one. If Manual is
  active, an AI Scripts Run synthesizes from the pasted research's text,
  same as it would from AI research.
- **Competitor auto-population runs on every research_copy save,
  independent of active status**, both Manual and AI, each scanning its
  own text. Gating it on "active only" would mean a competitor mentioned
  in the non-active version never surfaces until someone happens to
  flip it active later.
- **⚠ Superseded.** The Copy-Ready panel this bullet originally described
  is gone (redundant with the Research/Packaging structure both sides
  now have, see the "+ New" and phase-structure notes elsewhere in this
  doc); only Title's own "Use This" survives, `final_title` is still a
  live field. No active concept needed there either, same reasoning:
  each version's Packaging panel renders its own Titles list independent
  of which version is active.
- **`research_progress`** (the AI Run's own step-by-step polling status)
  stays tied to the Run process specifically, Paste never touches it,
  there's nothing to poll for a synchronous parse.
- **`scripts_versions.is_live`** has no current downstream technical
  consumer (nothing reads it programmatically the way Scripts' Run reads
  research_copy_versions' active flag), it exists for UI clarity and
  schema symmetry with Research & Copy, per this project's "build full
  schemas upfront" convention.

**UI**: both versions always render as two clearly labeled panels,
"Manual" and "AI Research" (`VersionPanel` in `research-and-copy-tab.tsx`
and `scripts-tab.tsx`), side by side at `lg:` and up, stacked below that
(two full research/script breakdowns side by side is real width to ask
for, per the responsive audit's finding about bare `grid-cols-2` staying
cramped on narrow screens, this one deliberately waits for `lg:`
instead). A version with nothing in it yet shows a plain "Nothing
pasted/run yet" placeholder rather than an empty shell. The active one
shows an "Active" badge; the other shows a "Make active" button.

## 9. System & Production removed, Competitor Benchmarks removed, "Go Deeper", Pillar/Sub-topic fixed

Five separate follow-up items, confirmed live one at a time, real risk
in two of them (data silently nulled on next Save, a whole-account page
starved of new data) caught and avoided before anything shipped.

**System & Production removed** (the collapsible section, not the
always-visible Production Status block above it, which stays exactly as
it was: production status, viability status, viability reason, pillar,
sub-topic, format, publish date, confirmed unaffected before touching
anything). **Update, 2026-08-27: viability status and viability reason
were later retired from this block too** (Production Status already
conveys workability, the pair was judged redundant), see the note below
this section for the follow-up. Performance metrics (Views/Likes/Comments/Shares/Saves/
Conversions) was the one field group in that section verified to feed
something outside itself, `src/lib/analytics.ts` reads those exact
columns for Analytics Overview's KPIs and charts, so it moved into the
always-visible block rather than being lost, right after Format/Publish
date. Every other field the section held (core/detailed tags,
repurposed-from, sequence step, evidence condition, script outline/
published URL, performance notes, series/playlist, search demand
signal, success metric focus, analytics review date, follow-up ideas,
retention drop notes, earned-the-click) lost its UI. Real bug caught in
the process: `updateContentItem` (`src/app/(app)/calendar/[id]/actions.ts`)
unconditionally wrote every one of those fields on every Save, `formData.get(...)
?? null` for a field with no more input in the form means every future
Save would have silently nulled all of them out, not just failed to
show them. Those keys are removed from that update entirely now, the
columns themselves stay in the schema, untouched, unused, per this
project's "superseded field stays schema-only" convention. One more
narrow, lower-stakes loss worth naming: the "Repurposed from (source
video)" dropdown (`derived_from_content_id`) lived in this section too,
its only UI setter is gone, so a new repurposed-from relationship can no
longer be set from the topic page. The read-only "Repurposed from: X" /
"Derivatives (N)" display near the top of the page is unaffected and
still reads whatever was set before.

**⚠ Update, 2026-08-27: Viability Status and Viability Reason retired.**
Removed from the always-visible Production Status block entirely (topic
page form, `src/app/(app)/calendar/[id]/actions.ts`'s write, and the
Calendar List's top-right dot, `ViabilityDot`/`viability-dot.tsx`,
deleted). Judged redundant with Production Status, which already
conveys whether an item is workable right now. The columns
(`viability_status`, `viability_reason_note`) stay in the schema,
frozen at whatever each item last had, unused by any UI now, same
"superseded field stays schema-only" convention as the rest of this
section; the Drive Markdown archive and CSV backup exports still read
them as a historical snapshot.

**⚠ Format/Platform updated since, see `format-platform-fields.tsx`.**
Format's own dropdown narrowed to Short/Long only, no legacy fallback
option (a pre-restriction value like "Reel" no longer has a way to
render in the select, full reasoning and the Analytics/Content-Output-
Tracker linkage check that shaped the Short/Long narrowing is in
`calendar/[id]/page.tsx`'s own comment history, not repeated here).
New: picking either Short or Long reveals a second field, "Posted on
(select all that apply)", a toggle-pill multiselect (selected state uses
the `Button` component's solid `default` variant for readability, same
pattern as `PhaseNav`) writing into the previously-unused
`content_calendar.platform` column. Its option list is exactly whatever
platform names exist in `goals.platform_name` for the brand, minus the
"Views" pseudo-goal (`isViewsGoal`, `src/lib/goals.ts`) — no separate
static list (the old `CONTENT_POST_PLATFORMS` in `src/lib/types.ts` is
gone), and deliberately not the shared `PLATFORMS` that Competitor
Benchmarks/Collaborators/Competitors use either. So a platform added via
Streak & Goals' "Add a platform goal" form becomes selectable here on
next load, in both Short and Long, and deleting that goal removes it
from here too, with no separate platforms-registry table. The item's
already-saved platform values are unioned in as well so a value never
silently disappears from its own picker after its goal is deleted
elsewhere, that union is case-insensitively deduped (e.g. a "TikTok"
goal and a "Tiktok" one, or an old saved value in different casing than
its current goal, collapse to one pill, first match wins). Exists so
Analytics can eventually count only the platforms an item actually went
out on, not assume every item reached everywhere. Clears automatically
if Format is switched away from Short/Long and the item is saved in
that state, on purpose: the field's only meaning is per-platform
distribution tracking.

**Competitor Benchmarks section removed** from the topic page
(`CompetitorBenchmarksSection`, both its auto-populated results display
and its manual "Add benchmark" form, the only UI anywhere that created
`competitor_benchmarks` rows). Per-video competitor tracking wasn't
valuable, whole-account tracking on the Competitors page covers it
better. Real question surfaced and confirmed before removing anything:
that whole-account page's own "Used in N topics" and "Avg Views"
numbers are themselves computed by aggregating `competitor_benchmarks`
rows, so removing the automatic write alongside the UI would have
starved the very page being kept. Resolved: automatic population
(`autoPopulateCompetitorBenchmarks`, Section 5) keeps running silently
in the background on every Research & Copy save, both Manual and AI,
regardless of active status, unchanged from Section 8. No manual
per-item entry exists anymore, only name-matched auto-detection.

**"Go Deeper (AI Research)"**: pressing Run inside the Manual panel,
once it has pasted content, no longer means "start a fresh independent
AI pass". `deepenResearchFromManual`
(`src/app/(app)/calendar/[id]/research-copy-actions.ts`) hands the
Manual version's data to `synthesizeResearchAndCopy`'s new `deepenFrom`
param (`src/lib/anthropic.ts`), which rewrites call 1's prompt (system
+ user content) to treat that pasted research as a real starting point,
"search for what this existing research doesn't already cover and build
on it, not replace it," rather than researching cold. Calls 2 and 3 in
the 3-call pipeline are unchanged, they just extract structure from
whatever call 1 produced either way. The result is still a real AI
synthesis (a real paid call), so it writes to the AI source
(`upsertVersionAndAutoActivate(..., "ai", ...)`), same as a normal Run,
Manual's own row is never touched by this, staying available to deepen
from again later. Same research_progress step tracking, same Competitor
auto-population as a normal Run. Button only renders in the Manual
panel, and only once it has content, "Go deeper from what I already
have," not something that makes sense with nothing pasted yet or from
the AI panel itself (that's just Run Again).

**Consistent Run-focused default, confirmed already correct**: checked
whether a brand-new item and a genuinely old item that's never had
research run (`g`, real pre-existing Brief Description/Keywords, no
research_copy_versions rows) render differently. They don't, the
Research & Copy tab's rendering is driven entirely by whether Manual or
AI versions exist for that item (`!manual && !ai`), never by how or when
the item was created, so both already show the identical clean,
Run-focused view (Run solid, Paste collapsed, "No research yet...").
No change needed, this item is closed by confirmation, not by a fix.

**Pillar and Sub-topic are real dropdowns now.** Real, confirmed bug:
they were plain text inputs with zero connection to `PILLAR_STRUCTURE`
(`src/lib/pillars.ts`), the same fixed Body/Mind/Soul (LBsTransformation,
5 branches each) / Build/Sell/Scale (LBsWorks, 6/5/7 branches) vocabulary
already used by the Competitors page's sub-topic multiselect and other
pillar/branch selectors. Fixed as `PillarSubTopicSelects`
(`src/components/pillar-sub-topic-selects.tsx`), two coupled native
`<select>`s (not the Competitors page's tag-input multiselect, this is
one pillar and one sub-topic per item, not a set): Sub-topic's own
option list re-derives from whichever pillar is currently selected
(keyed on pillar, so changing it remounts Sub-topic fresh rather than
leaving a now-mismatched value selected), not every branch from every
pillar at once. A pre-existing value that doesn't match the fixed
vocabulary at all (legacy free text, or a value belonging to the other
brand) stays selectable as its own extra option instead of the select
silently falling back to its first option and wiping that value out on
the next Save, verified live against a genuinely old item carrying
exactly that kind of legacy value.

## 10. Custom sub-topic removal (Topic Map)

Confirmed spec, corrects an earlier "no removal" instruction given (and
followed) in conversation before this section existed: custom sub-topics
turned out to need a real, deliberate way to be taken out of circulation,
just not an easy, one-tap one.

Two kinds of sub-topic, treated differently:

- **Locked/structural**: the fixed `PILLAR_STRUCTURE` vocabulary
  (`src/lib/pillars.ts`, the 5-per-pillar LBsTransformation / 6-5-7
  LBsWorks branches). Permanently non-removable, no UI for it exists or
  should exist.
- **Custom**: rows in `custom_sub_topics`
  (`supabase/migrations/0016_custom_sub_topics.sql`), added from the
  Topic Map page's own form. Removable, via soft-delete only.

**Soft-delete, never hard-delete.** `custom_sub_topics.is_archived`
(present in the schema from the start, per this project's "build full
schemas upfront" convention) is what "removed" actually means here.
`archiveCustomSubTopic` (`src/app/(app)/topic-map/actions.ts`) sets it
true; the row is never deleted. `getMergedPillarStructure` and
`listCustomSubTopics` (`src/lib/custom-sub-topics.ts`) both already
filter `is_archived = false`, so an archived sub-topic stops being
offered in every "add a new tag" picker across the app (Idea Panel,
Production Status, Competitors, Journey Log, Topic Map itself) the
moment it's archived, with no picker-specific change needed, they all
already read through one of those two functions.

**Already-tagged content is unaffected.** Every table that carries a
sub-topic tag (`journey_log.sub_topic`, `content_calendar.sub_topic`,
`ideas.sub_topic`, `competitors.sub_topics`) stores it as plain text on
the row itself, not a foreign key into `custom_sub_topics`. Archiving a
custom sub-topic changes nothing about content already tagged with it,
that tag keeps rendering exactly as it does today, indefinitely.

**Real friction before removing**, not a one-tap accident:
`RemovableSubTopicPill` (`src/components/removable-sub-topic-pill.tsx`)
renders custom pills on the Topic Map with a small × that only opens an
inline confirm step, showing how many existing items are currently
tagged with it (`getCustomSubTopicUsageCount`, summed across all four
tables above, matched by brand + name since those tables don't all keep
pillar and sub-topic reliably in sync with each other). Removal itself
only fires on a second, explicit click inside that confirm step. Locked/
structural pills never render this control at all, `TopicMapPage`
distinguishes the two by checking each rendered pill against the brand's
active `custom_sub_topics` rows.
