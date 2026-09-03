# Manual Workflow: Research → Packaging → Scripting

Supersedes the current Manual panel's simpler two-part structure
(Research & Copy, Scripts) with a three-phase workflow, matching the
source template in full. This applies to the Manual side only, AI
Research's existing single-pass structure is untouched unless a later
decision says otherwise.

## Core principle: phase-gated, not freeform

The source template is explicit: complete one phase at a time, don't
auto-advance, wait for approval before the next phase starts. The UI
should enforce this same discipline, not just describe it:

- Packaging is inaccessible/shows a clear gate until Research exists
  for this item.
- Scripting is inaccessible/shows a clear gate until Packaging exists.
- Each phase carries its own explicit status: APPROVED, NEEDS REVISION,
  or REJECTED, shown as a real visible badge, not just parsed text.

## Navigation

When Manual is selected, present three options styled like the existing
brand-switcher pill toggle: Research, Packaging, Scripting. Each has its
own dedicated "Paste from AI chat" import, matching that phase's exact
template output. No combined single-paste import, phases are pasted
separately, matching how they're generated.

The outer page chrome (tabs, header, brand switcher) stays fixed. Only
the content within the currently active phase scrolls, in its own
contained scroll region, not the whole page.

## Phase 1: Research

Parsed fields, matching the template's 26-item Research Output exactly:
Topic Definition, Primary Pillar and Subtopic, Main Audience Problem,
Audience Desire, Audience Confusion, Current Developments, Important
Findings, Direct Competitor Content, Related Content, Competitor
Strengths, Competitor Weaknesses, What Competitors Missed, Frequently
Asked Questions, Unanswered Questions, Viewer Pain Points, Viewer
Objections, Viewer Misunderstandings, Viewer Requests, Viewer
Suggestions, Content Gap Analysis, Five Content Opportunities,
Recommended Opportunity, Viewer Transformation or Desired Outcome,
Sources, Research Limitations, Research Quality Status.

Special handling:
- Each of the five Content Opportunities carries five numeric scores
  (Relevance, Evidence, Novelty, Evergreen, Visual Potential, each
  0-10), render as small visible bars or badges, not plain numbers in
  a paragraph.
- Confidence levels on individual factual claims render as a small
  visible tag (e.g. high/medium/low), same reasoning.
- The final APPROVED/NEEDS REVISION/REJECTED line becomes this phase's
  status badge.

A research skill's actual response is typically much longer than these
26 items: a narrative write-up ahead of RESEARCH OUTPUT (what's
happening around the topic, why it matters, full competitor profiles,
raw audience comments, a fuller Content Gap Analysis and Five Content
Opportunities than the compact recap under items 20-21 restates) that
this phase deliberately does not parse into its own fields, that's
scratch work the template's own "RESEARCH OUTPUT: Return only [26
items]" instruction says to compress, not a second deliverable. The
full original paste is always saved regardless (manual_workflow_phases
.raw_pasted_text), and is shown as a collapsed "Original pasted text"
section below the parsed fields so none of it is actually lost, just
not broken out into structured fields. If the preamble's own content
(the template's Phase 1 "Find:" 1-10 list) turns out to be worth
parsing into its own fields and section, that's a separate, later
change, not implied by this one.

## Phase 2: Packaging

Gated on Research existing. Parsed fields: three titles (each with
research support, viewer problem addressed, promise, click reason, risk
of misleading), seven platform-specific copy-ready versions (YouTube
description, Short-form caption, Instagram, TikTok, YouTube Shorts, X,
Threads), short keywords, search phrases, three thumbnail suggestions,
two visual hooks, two textual hooks, two verbal hooks, carousel
suitability evaluation, three CTA options, and the six "strongest X"
recommendations at the end.

## Phase 3: Scripting

Gated on Packaging existing. Parsed fields: Version 1 (detailed
long-form script, 16 sequenced sections, each with title/purpose/exact
narration/visual direction/on-screen text/b-roll/transition/timing/
source markers), Version 2 (pointer-based structure, same section
sequence without full narration), short-form suitability evaluation
with its own score, the 30-second and 60-second scripts plus three
additional concepts if suitability scores 6+, optional carousel script,
and the closing status fields (strengths, claims requiring
verification, missing examples, personal information needed,
recommended production step, script status).

## Anti-fabrication markers, surfaced everywhere they appear

`[VERIFY]`, `[PERSONAL INPUT NEEDED]`, and `[EXAMPLE NEEDED]` are the
template's core safety mechanism. Wherever any of these appear in
parsed content, render as a distinct, visually obvious colored badge
inline, not plain bracketed text easy to skim past. This is the single
most important visual treatment in this whole feature, these markers
exist specifically so nothing fabricated slips through unnoticed.

## Fallback behavior

Same rule as the existing Paste from AI chat feature: if a pasted
phase's structure can't be confidently matched, don't guess or fail
silently, show the raw text in an editable area instead.
