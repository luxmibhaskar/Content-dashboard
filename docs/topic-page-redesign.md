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

- **Top-left**: Title (one line, truncated).
- **Top-right**: the Viability Status dot (green/amber/grey), not the
  pillar tag. This is the deliberate choice: whether an item is
  workable right now is the thing worth a glance-able top corner, ahead
  of which pillar it belongs to.
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

Condensed to three fields only, shown centered in a comfortably
proportioned layout, not full-width stretched: Title, Brief Description,
Keywords. This is context only, nothing else collects input here. A
"Run" action triggers the first research pass.

## 2. Topic page: two tabs, not five sections

Remove entirely as separate sections: Creator Input, Audience Strategy,
Viewer POV, Normal POV, Recording Section. Replace with exactly two tabs,
styled visually like the existing brand-switcher pill toggle, not a plain
tab bar.

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

**Save path, shared with Run**: parsing happens server-side
(`importResearchCopyPaste`/`importScriptsPaste`,
`src/app/(app)/calendar/[id]/research-copy-actions.ts` and
`scripts-actions.ts`), and on a confident parse both actions call the
exact same shared save function the real AI-calling Run uses
(`saveResearchCopyResult`/`saveScriptsResult`, extracted from the
previously-inlined Run logic specifically for this). For Research &
Copy, that means Competitor auto-population (Section 5) and
`research_progress` being marked done fire identically whether the
research came from a paid Run or a free paste, no separate path that
could silently skip either. Verified live: a well-formed paste with a
known competitor's name in the summary correctly surfaced an
auto-populated Competitor Benchmark, exactly as a real Run would.
