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
