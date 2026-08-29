# Body–Mind–Soul Dashboard — Final Builder Brief (v1.3)
**For: LBsTransformation + LBsWorks**
**Status:** Ready to Build / Ready to Ship
**Changelog from v1.2:** Added Reference Videos (per-topic manual research), Research Snapshots (Potential Data + History + Refresh Research), inline Recording fields (Main Pointers + Full Script), and Daily Streaks. Refined the tech stack (Sections 2, 18) to add Tremor and react-d3-tree in place of hand-built Recharts/raw D3, for a more polished look with less custom code. Locked the LBsWorks post-Month-One Pillar Tree structure (Build / Sell / Scale, Section 15.2). Added a Prerequisites checklist (Section 2.5) covering every account and API key needed. Made the AI provider layer explicitly swappable (Section 2). Redesigned the backup into two layers (Section 17): a structured Google Sheets index for quick scanning, plus a Google Drive Markdown archive for full‑length content that doesn't fit a cell, topped with a self‑describing System Manifest so a new dashboard or AI could pick this up cold. **Full audit pass:** restored the fully enriched Body/Mind/Soul structure (Section 15.1) that had reverted to an earlier, simpler version; fixed a Quora inconsistency between sections; added drag‑to‑reorder to the Content Calendar list view (Section 10.0); added the Sub‑topic Completeness Checklist, Audience Time‑Debt Indicator, and Direct‑Address Voice Rule (Section 2), all previously discussed and confirmed but missing from the document. Expanded the Recording Section with landing lines, an energy tag, per-point runtime estimates, and voice-memo-first capture with real transcription. Added a UX Principles section (4.3) establishing global search, persistent quick-add, consistent pillar colors, breadcrumbs, persistent filters, and guided empty states as cross-cutting design rules. **Risk audit pass:** flagged that YouTube transcripts aren't always available (added a fallback); added an explicit anti-fabrication guardrail so the AI flags low-confidence research instead of papering over gaps; corrected overly optimistic framing on SERP API costs and Supabase storage growth; wired `hook_type` explicitly to the live variant so the Hook Library chart doesn't silently stay empty; added nightly sync failure visibility; restored the tree-visualization fallback note. Added a System & Services Panel (5.3), a collapsible bottom-of-Today section listing every backend dependency, its cost tier, and swap alternatives, with live usage numbers pulled in where providers allow it, plus a one-tap "Check Alternatives" research action per service that reuses the existing search and AI infrastructure to surface current competitors and a plain switch-or-stay verdict, informational only, never automatic. **Verification pass:** found and fixed two contradictions the new table introduced (missing from the data model list, and conflicting with the blanket brand-scoping rule), both now consistent, plus a full structural check of section numbering and table counts. **Confirmed** the Direct-Address Voice Rule applies to both brands. **Added a hot/cold archiving lifecycle** (17.4): published content over 7 days old auto-archives its heavy fields to the already-built Drive archive, keeping Supabase lean, with a one-tap retrieve that brings full detail back for another 7 days, directly solving the storage growth risk flagged earlier using infrastructure already in place. Added `idea_source` and `source_detail` tracking (Comment/DM/Mind/Competitor/Internet) on the Idea Panel, carried through to published content, feeding a new Idea Source Performance graph so you can see with real numbers whether audience comments actually outperform your own ideas, not just guess. **Clarity pass:** found a genuine, repeated source of confusion, the topic page's five local sections (Creator Input, Viewer POV, Research Output, Publishing Ready, System & Production) were numbered "Section 1" through "Section 5," colliding with the document's own top-level Section 1 through 5, which mean completely different things. This caused real ambiguity in over a dozen cross-references throughout the document, including a mistake in this document's own earlier phrasing. Renumbered the topic page's subsections as 10.1.1–10.1.6 (Recording Section included) and fixed every cross-reference to match, so "Section 2" now only ever means one thing. **Also caught two leftover stale references from that same renumbering, and one genuine build-order contradiction:** Section 6.3 labels itself "Core Graphs, Build First" and Phase 1 says to build from that list, but Hook Type Performance on that list has no real data until Phase 2's variant system exists, it would have built as an empty, unexplained chart. Now explicitly flagged as Phase 2-dependent, with Phase 1's list clarified to the 3 graphs that actually work immediately. **Growth features pass:** added four things genuinely absent that matter for actually growing, not just organizing: Goals & Milestones (6.5) tying real targets to the Skool community vision; a Collaboration & Outreach tracker (14.3) mirroring Competitors for borrowed-audience growth; Repurposing Performance tracking (`derived_from_content_id`) linking derivative content back to its source and flagging untapped atomization opportunities; and a Best Time to Post insight from `publish_time` data already being entered anyway. **Phase sequencing check:** found Goals & Milestones and the Collaboration & Outreach tracker were both fully specified but never actually added to any Build Phase, only mentioned in changelog narrative, both now placed in Phase 2 alongside Competitors. Also clarified that the Search Everywhere principle's scope grows across phases (fewer sources searchable in Phase 1, expanding as Phase 2 tables come online) rather than being blocked, a graceful-degradation note, not a fix for anything broken. **Build efficiency pass:** found one genuine waste-of-effort risk, Phase 1's build list included dedicated UI for `benchmark_comparable_content`, a field already labeled legacy in its own definition, right before Phase 2's real `competitor_benchmarks` system supersedes it almost immediately. Removed the throwaway UI build, the field now exists in schema only. Added two standing efficiency principles to the Build Phases intro: build full schemas upfront across all phases rather than migrating them later, and never build dedicated UI for anything already known to be superseded within a phase or two. **Workflow trace pass:** followed the actual end-to-end journeys rather than checking features in isolation, found three real hand-off gaps. The Idea Panel's "Research" step said it "optionally" creates a "minimal" content_calendar row, but research_snapshots has a hard FK requirement to content_calendar and populates full sections, it's neither optional nor minimal, wording fixed to match reality. The `is_live` flag that drives Copy-Ready, Hook Library, and the repurposing display was never given an actual UI action, added an explicit "Use This" button with radio-style exclusivity. And nothing described how view/engagement numbers get updated for non-YouTube platforms after publishing, added as a 6th Weekly Review checklist item, since without it those numbers just stay blank forever and every graph depending on them quietly goes incomplete. **Design pass:** applied real visual hierarchy to Today (streak numbers quiet, next-up suggestion the clear colored hero, Services collapsed at the bottom) and found a genuine gap in the Calendar list, viability status only ever showed on the full page, meaning you'd open several items just to find one that's actually workable, added a small color dot to every card so it's visible at a glance, plus a subtle accent on today's entry in the Week view. **Artistic pass on the Pillar Tree (15.1):** branches now specified as tapered organic filled shapes at uneven angles, not uniform spokes; leaf-shaped tips instead of plain pills, solid for covered topics, hollow buds for locked ones; a subtle gradient trunk; real-feel guidance on slow branch sway and a bloom animation for unlocking, not an instant state flip; and a responsive plan for mobile, one tree at a time rather than shrinking the same detailed layout. See Section 21.

***

## 0. What This Is

A private, two‑brand content operating system for a solo creator:

- **LBsTransformation** – Body / Mind / Soul self‑development channel.
- **LBsWorks** – Build‑in‑public channel (digital products, tech/AI, productivity).

It combines:

- A **date‑based Content Calendar** (idea → research → script → publish → analytics).
- A **sequence‑based planning layer** (V1–V8 for LBsWorks, optional sequences for LBsTransformation).
- A **journey log** (daily/weekly journal of lived experience).
- An **analytics dashboard** (performance by pillar, sub‑topic, hook type, funnel, etc.).
- Built‑in **competition tracking** (per topic + optional competitors overview).
- A **versioned research archive** per topic (raw pulls, refreshable, never overwritten).
- Inline **recording support** (cue cards + full script, no tab‑switching mid‑record).
- A **daily streak log** tying the personal transformation habit into the system itself.
- Lightweight **idea capture**, **hook library**, **angle bank**, and **weekly review**.
- A **System & Services Panel** showing every backend dependency, its cost, and one‑tap research into current alternatives, so infrastructure choices stay visible and swappable, never locked in by default.

Everything is private, text‑based, and backed up nightly across two layers, a structured Google Sheets index and a full‑content Google Drive archive (Section 17).

***

## 1. High‑Level Requirements

- **Two brands**, same app, separate data:
  - Every record has a `brand` field: `LBsTransformation` or `LBsWorks` — **one exception:** `service_alternative_checks` (Section 5.3) has no `brand` field, since the backend infrastructure it describes is shared across both brands in one deployment, not duplicated per brand.
  - UI has a **Brand Switcher** at the top; all views filter by selected brand.
- **Private access only**:
  - Simple auth (magic link or password).
  - No public pages, no public profiles.
- **Responsive desktop‑first web app**:
  - Primary use: desktop browser.
  - Mobile is "nice to have", not critical for v1.
- **No double entry**:
  - Analytics pull from tags/fields already set on content items.
  - Hook Library, Angle Bank, and pattern views are **aggregations**, not new data entry forms.
- **Calendar vs Sequence**:
  - **Content Calendar** = **date‑based** (sorted by `publish_date`).
  - **Sequence View** = **order‑based** (sorted by `sequence_step` / `sequence_order_custom`).
  - Same underlying `content_calendar` table; different views and sort logic.
- **Research is append‑only**:
  - Refreshing research on a topic never deletes or overwrites prior pulls.
  - Every refresh creates a new dated snapshot; the latest one drives the live view.

***

## 2. Recommended Tech Stack

Use this unless you have a strong reason to change:

- **Frontend:** Next.js (React)
- **Hosting:** Vercel (Hobby tier is fine)
- **Database:** Supabase (free tier) — bundles Auth + Storage + Realtime alongside Postgres, meaning less custom backend code to write and maintain than a database-only service.
- **Dashboard UI / Charts:** Tremor — free, Vercel-backed, purpose-built for exactly this: KPI cards, trackers, sparklines, and chart components, built on Tailwind + Radix. Use this for the Analytics Overview (Section 6) instead of hand-building charts from raw Recharts.
- **Tree Visualization:** react-d3-tree + Framer Motion — react-d3-tree wraps D3's tree layout with minimal setup, so the Pillar Tree (Section 15) gets the same growing-branch result as raw D3 with far less custom code to debug. Framer Motion still handles the animation layer on top. **Honest fallback:** the organic "growing branch" animation is a nice-to-have, not the core function. If it fights the build or eats disproportionate time, a clean expand-and-collapse tree (no growing animation) does the same navigational job. Don't let the visual flourish become a blocker on an otherwise-working feature.
- **General UI components:** shadcn/ui — buttons, dropdowns, modals, toggles; copy-paste Tailwind + Radix components so these don't need to be hand-built one by one.
- **Styling:** Tailwind CSS (shared foundation under Tremor, shadcn/ui, and custom components alike)
- **Backup:** Google Sheets API via service account (nightly sync)

**Why this combination:** Next.js, Vercel, Supabase, and Tailwind remain the right foundation. Tremor and react-d3-tree specifically reduce how much custom code is needed for the two most visually complex parts of this build, the Analytics Overview and the Pillar Tree, which matters most since you're directing this build through Claude Code rather than writing the code yourself.

**AI provider — build this as a swappable module, not a hardcoded dependency.** All calls to an AI model (research synthesis, ranked Title/Hook/Thumbnail generation) should route through a single internal function (e.g. `getAISuggestion()`), not scattered directly through the app. That one function is the only place that knows which provider it's calling. Starting provider is Claude (Anthropic API, since it's already needed for Claude Code and tends to test well for tone-matching and structured output), but switching to Gemini, GPT, or anything else later should mean changing one file and one API key, never a rewrite. Treat the model choice as a commodity input to test and swap freely, not a fixed dependency.

**Guard against confident-sounding fabrication.** When research for a topic is thin, few Reddit threads, no strong "People Also Ask" results, sparse Quora signal, the AI generating ranked suggestions must say so explicitly ("limited research found, suggestions are lower-confidence") rather than producing polished-sounding output that implies more evidence than actually exists. This matters more than it might seem: sparse-but-honest research is useful, confident-but-fabricated research is actively misleading. The prompt should instruct the model to cite which specific pieces of pulled evidence support each suggestion, and to flag low-confidence output rather than smooth it over. This also means prompt quality, not just model choice, is what determines whether research feels rich and real versus generic, worth genuine iteration during Phase 2, not a set-and-forget prompt.

All data lives in Supabase; Google Sheets is a **read‑only nightly mirror**.

***

## 2.5. Prerequisites — Accounts & Credentials to Gather First

Set these up before or during the phase noted. Nothing here needs to be perfect in advance, Claude Code can walk through each setup step live, this is just so you know what's coming.

**Cost summary, honestly:** GitHub, Vercel, Supabase, Google Sheets, and YouTube API all stay genuinely free at solo-dashboard usage levels. Reddit's API is also free for non-commercial use, but no longer instant to set up (see below). Two items carry a real, small, ongoing cost: the Anthropic API key (no free tier) and, potentially, the search/SERP API once past its free monthly allowance.

**Needed before Phase 1 (Core)**

- **GitHub** — free account; hosts the code and connects to Vercel for auto‑deploy on every push.
- **Vercel** — free account (Hobby tier); link it to the GitHub repo.
- **Supabase** — free account; create a project, then note the Project URL, anon key, and service role key. (Free‑tier projects pause after 7 days of inactivity, not a concern given daily use.)
- **Google Cloud Console** — create a project, generate a **service account** for Google Sheets access (produces a JSON credentials file, not a simple API key), then share the backup Sheet with that service account's email address directly. Free at this volume. The Phase 2 Drive archive does **not** use this service account (service accounts have no Drive storage quota of their own, so they can't create files): it authenticates as your own Google account via OAuth instead, set up with a one-time `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` / `GOOGLE_OAUTH_REFRESH_TOKEN` in the same Cloud project (Section 17.2, `docs/env-reference.md`).
- **AI API key** (separate from the Claude Code subscription used to build this) — **no free tier on any major provider, billed per token from the start.** Starting recommendation: Anthropic API key from console.anthropic.com, since it's already the most natural fit while building with Claude Code, but this is a swappable choice, not a commitment (see the AI provider note in top-level Section 2). The live dashboard needs its own way to call an AI model at runtime, since generating ranked Title/Hook/Thumbnail suggestions (10.1.3 on the topic page) and synthesizing research into the Viewer Research Panel is a reasoning task, not something the database performs on its own. Given the actual call pattern here, occasional synthesis, not constant use, expect a genuinely small monthly cost regardless of provider chosen.

**Needed before Phase 2 (Research automation)**

- **Google Cloud Console** (same project as above) — enable the YouTube Data API v3, generate a separate API key for it. Free within the standard daily quota, comfortable for personal research volume.
- **Reddit** — free for non‑commercial personal use (about 100 queries/minute), but **self‑service registration closed under a late‑2025 policy change**; new API access now requires manual approval through Reddit's own contact form rather than instant signup. Costs nothing, but budget real wait time before Phase 2 can use it, don't leave this until the last minute.
- **A search/SERP API service** — Google's own Custom Search API closed to new signups in 2026, so this now runs through a third‑party provider (e.g. SerpApi or similar). Most offer a recurring free allowance (roughly 100–250 searches/month). **Being realistic, not optimistic:** refreshing research across even 10-15 topics a month can burn through that free allowance faster than it sounds, each refresh is a search, not each topic. Budget for this potentially becoming a small paid line item sooner than "light use" suggests, rather than assuming it stays free indefinitely.

**Not needed — manual by design**

- TikTok, Instagram, Threads, Facebook: no account or API, stays paste‑a‑link plus manual notes (Section 10.2.1, Section 16).
- Quora: no official public API; runs through general web search results rather than a dedicated integration.

***

## 3. Data Model Overview

Core tables (all with `brand` field, **one exception noted below**):

1. `journey_log` – My Journey Log entries.
2. `ideas` – Idea Panel entries.
3. `content_calendar` – Full topic pages / content items. Includes `is_archived` and `last_active_at` for the hot/cold archiving lifecycle (Section 17.4). *(fields new in v1.3)*
4. `title_variants` – Title options per content item.
5. `hook_variants` – Hook options per content item.
6. `thumbnail_variants` – Thumbnail options per content item.
7. `weekly_reviews` – Sunday review records.
8. `competitors` – Competitors you track (optional but recommended).
9. `competitor_benchmarks` – Per‑topic competitor references.
10. `backup_log` – optional, to track last sync.
11. `reference_videos` – manual TikTok/IG/Reels links per topic, with hook/re‑hook/CTA notes. *(new in v1.3)*
12. `research_snapshots` – dated, append‑only raw research pulls (YouTube/Google/Reddit/Quora) per topic; powers Potential Data + History. *(new in v1.3)*
13. `daily_streaks` – daily walk/posting log; powers the streak counter in Today + Analytics. *(new in v1.3)*
14. `service_alternative_checks` – dated research checks on backend service alternatives, powers the System & Services Panel's "Check Alternatives" action. **No `brand` field** — the infrastructure this describes is shared across both brands in one deployment, not duplicated per brand like everything else in this list. *(new in v1.3)*
15. `goals` – progress tracking toward real targets (subscribers, revenue, community members). *(new in v1.3)*
16. `collaborators` – potential and active collaboration/outreach tracking, mirrors `competitors` but for partnership growth. *(new in v1.3)*

Relations:

- `ideas` → `content_calendar` (`migrated_to_id`, optional).
- `content_calendar` → `journey_log` (for angle/proof, via relation or IDs).
- `content_calendar` → `title_variants`, `hook_variants`, `thumbnail_variants` (one‑to‑many).
- `content_calendar` → `competitor_benchmarks` (one‑to‑many).
- `competitor_benchmarks` → `competitors` (many‑to‑one, optional).
- `content_calendar` → `reference_videos` (one‑to‑many). *(new in v1.3)*
- `content_calendar` → `research_snapshots` (one‑to‑many, ordered by `snapshot_date`). *(new in v1.3)*
- `daily_streaks` is standalone, brand‑scoped, one row per date. *(new in v1.3)*
- `service_alternative_checks` is standalone, system‑level, no brand scoping, one row per service per check. *(new in v1.3)*

All tables include standard fields: `id`, `created_at`, `updated_at`, `brand`, **except `service_alternative_checks`, which has no `brand` field for the reason noted above**.

***

## 4. Navigation & Top‑Level UI

### 4.1. Brand Switcher

- Top bar, left or center.
- Toggle: **LBsTransformation** ↔ **LBsWorks**.
- Changing brand refreshes all views to that brand's data.

### 4.2. Main Tabs (per brand)

Show these as top‑level nav items:

1. **Today**
2. **Analytics Overview**
3. **Pillar Tree** (LBsTransformation) / **Sequence View** (LBsWorks)
4. **Content Calendar**
5. **Idea Panel**
6. **Hook Library**
7. **Personal Angle Bank**
8. **My Journey Log**
9. **Quick Capture**
10. **Review**
11. **Competitors** *(optional for v1, recommended by v2)*

All tabs filter by selected brand.

### 4.3. UX Principles — Findability & Planning Ease *(new in v1.3)*

These apply across every screen in this spec, not just one section. The goal throughout: find anything fast, never feel overwhelmed by what's visible at once, and never lose track of where you are.

- **Search everywhere.** A persistent search, reachable from any screen, searches across `content_calendar`, `journey_log`, `hook_variants`, and `research_snapshots` summaries together, not scoped to one tab. With 75+ topics eventually, clicking through the tree every time isn't realistic. **Phase note:** `hook_variants` and `research_snapshots` don't exist until Phase 2, so search naturally covers `content_calendar` + `journey_log` from Phase 1 and expands as each later table comes online, this degrades gracefully, nothing breaks, it just searches fewer sources early on.
- **One quick-add, reachable from anywhere.** A persistent "+" present on every screen, opens straight to the Idea Panel's fast capture (Section 8), never buried behind navigation. Ideas hit at random moments, capture should never require finding the right tab first.
- **One consistent color per pillar, used everywhere.** Body, Mind, Soul (and Build, Sell, Scale for LBsWorks) each get one fixed color, applied identically in the tree, calendar tags, and KPIs. Recognition by color and shape before reading a word.
- **Today is always the landing screen.** Opening the app always lands on Today (Section 5), never Analytics or the Calendar, so "what do I do right now" is the first thing seen, not a wall of data.
- **Breadcrumb trail on nested screens.** A small persistent trail, e.g. "LBsTransformation → Mind → Confidence → [topic]", at the top of any nested view, one tap back to any level instead of repeated back-navigation.
- **Filters persist.** Filtering the Calendar to one pillar or one viability status stays applied until explicitly cleared, never silently resets on reopen.
- **Empty states guide, never look broken.** A pillar or branch with nothing in it yet shows a clear next step ("add your first topic here"), not a blank space that reads as an error.
- **Recently viewed, quick jump back.** A small "continue where you left off" list on Today or in search, since work happens in short, impromptu bursts throughout the day, not long sittings.
- **Saved entries open read-only, not straight into a form.** Opening a saved record from a list (Journey Log entry, Idea, Weekly Review week) lands on a clean read-only summary of its content, long summaries clamp behind a "Show more" toggle, with one clear **Edit** action that switches to the real form. The edit state is a `?edit=1` query param on the same URL (server-rendered, so back/refresh behave), and a save resolves back to the read view. Exceptions: a brand-new entry with nothing in it yet opens straight in the form (there is nothing to read), and destructive actions (Delete) live in edit mode only, off the read view. Shared shell is `components/entry-read-view.tsx` (`EntryReadView` + `ReadField`); each section supplies its own field layout since the fields genuinely differ.

***

## 5. Today View

Purpose: "What should I do right now?"

**Visual hierarchy, top to bottom** *(new in v1.3)*: streak numbers stay small and quiet, motivational context, not the task itself. The next-up suggestion is the clear visual hero, a large, pillar-colored card, unmistakably the one thing to tap. Any second option sits noticeably quieter below it, an alternative, not competing for attention. The System & Services panel stays collapsed at the very bottom, infrastructure belongs out of sight until deliberately sought.

### 5.0. Streak Display *(new in v1.3)*

- Small, always‑visible strip at the top of Today, above the next‑up suggestions.
- Two counters, computed from `daily_streaks`:
  - **Walk streak** — consecutive days with `walked = true`.
  - **Posting streak** — consecutive days with `posted = true`.
- A streak breaks (resets to 0) the first day either field is `false` or missing; the dashboard does not backfill or forgive gaps automatically.
- Tapping either counter opens a simple log‑today prompt (two toggles: Walked today? / Posted today?) if today's row doesn't exist yet.

### 5.1. For LBsTransformation

- Show **1–2 next‑up suggestions**:
  - Next unchecked topic in Pillar Tree, or
  - Next item in any defined sequence (if/when you add them).
- On **Sundays**, show the **5‑item Weekly Review checklist** (see Section 12).

### 5.2. For LBsWorks (Month One)

- Show **next video in the sequence**:
  - Based on your custom order (if set), otherwise
  - Default V1–V8 order.
- Each video shows:
  - `sequence_step` (V1, V2, …)
  - `status`: Ready to make / Waiting on evidence (optional).
  - `evidence_condition` (text, optional, e.g. "3‑week Pinterest window").

**Important:**
- The V1–V8 sequence is **reorderable** and **not hard‑locked**.
- You can record and publish out of sequence if you choose.
- The sequence is a **planning aid**, not a technical constraint.

After Month One, LBsWorks can also use a Pillar Tree (digital products, tech/AI, etc.).

### 5.3. System & Services Panel *(new in v1.3)*

A small collapsible section at the very bottom of the Today screen, collapsed by default so it never competes with the actual "what do I do right now" purpose of this view, one tap to expand when you want to check on it. This is the in-app companion to the System Manifest (Section 17.3): the manifest is the portable file for a new system to read, this panel is the live view for you.

Every backend service the dashboard depends on, listed plainly:

| Service | Powers | Tier | Est. Cost | Swap alternatives |
|---|---|---|---|---|
| Supabase | Database + login | Free | $0 (watch storage over time) | Neon, PlanetScale |
| Vercel | Hosting | Free | $0 | Netlify, Cloudflare Pages |
| GitHub | Code storage | Free | $0 | GitLab, Bitbucket |
| Google Sheets + Drive | Backup (two layers) | Free | $0 | Any spreadsheet + cloud storage combo |
| YouTube Data API | Research automation | Free (daily quota) | $0 | — (no real substitute for YouTube-specific data) |
| Reddit API | Research automation | Free (approval required) | $0 | SerpApi site:reddit.com search, see note below |
| SERP API (e.g. SerpApi) | Currently unused/dormant (Google search behavior research pull has no caller, see Section 16 note); key stays configured for the Live Status account check | Free tier, then paid | $0–25+/mo | Any competing SERP API provider |
| AI provider (starts as Anthropic) | Research synthesis, ranked suggestions | Paid, usage-based | Small, usage-based | Gemini, GPT, any provider (Section 2) |

**Two tiers of what this panel actually shows:**

- **Static reference (build this first, Phase 1)** — the table above, plainly displayed: what each service does, its tier, and what you'd switch to if you wanted out. No live checking needed, this is just documentation surfaced as UI instead of buried in a file, trivial to build, immediately useful.
- **Live status (Phase 3 enhancement, where the provider actually allows it)** — for services with a usage/status API of their own (Supabase storage %, YouTube's daily quota used, SerpApi's searches remaining this month), pull that number in on expand, so you see e.g. "Supabase: 340MB / 500MB" or "SerpApi: 40/250 searches used this month" right in the panel, not something you have to go check on each provider's own site separately. Not every service exposes this cleanly, Reddit and Anthropic's billing don't have a simple pull-a-number check, those stay as static reference with a link to check manually on the provider's own dashboard.

The point of this panel isn't constant monitoring, it's making sure "am I about to hit a limit" or "is this still the best option" is always one tap away instead of something you'd only discover when it breaks.

**"Check Alternatives" — one-tap research per service.** Next to each row, a small button that, when tapped, runs a real web search (reusing the same SERP API already set up for content research, Section 16, no new dependency) for current competitors to that specific service, then feeds the results through the same AI synthesis already powering research suggestions (Section 2), a related but separate function, not the content-research pipeline repurposed as-is. It returns 2–3 real alternatives found, their free tier details, paid starting price, and a plain verdict: worth switching, your current pick is still solid, or worth testing first. Dated on each check ("Last checked: Aug 16, 2026") so you always know how fresh it is, results persist until you re-check rather than disappearing.

**This never switches anything automatically.** It's pure information, kept separate from any real migration, which stays entirely your call, consistent with the "prohibited actions require the user to do it themselves" boundary already built into how this whole system treats irreversible or account-level changes.

New table (system-level, not brand-scoped, since the infrastructure is shared across both brands regardless of which one's active): `service_alternative_checks` — `id`, `service_name`, `checked_date`, `findings_summary`, `verdict`.

***

## 6. Analytics Overview

Opens first when you launch the dashboard.

### 6.1. Global Time Filter

- Select: **Today / 7 days / 30 days / 90 days / This Year / All‑time**.
- Changes the view only, never underlying data.
- Applies to all graphs and KPIs on this page.

### 6.2. Top Row KPIs

Show as large numbers with labels:

1. **Total Published** – count of items where `status = 'published'` and `publish_date` in range.
2. **Total Views** – sum of views (if tracked).
3. **Total Engagement** – sum of likes + comments + shares (+ saves if tracked).
4. **Avg Engagement Rate** – `(total_engagement / total_views) * 100`.
5. **Total Conversions** – clicks, sign‑ups, challenge joins, etc. (if tracked).
6. **Avg Conversion Rate** – `(total_conversions / total_views) * 100`.
7. **Current Streak** – walk + posting streak from `daily_streaks`, shown as a small pair of numbers, not a graph. *(new in v1.3)*

If conversions aren't tracked yet, hide those two KPIs gracefully.

### 6.3. Core Graphs (Build First)

All graphs pull from `content_calendar` and related tables.

1. **Content Performance Over Time**
   - Type: line or area chart.
   - X: time (days/weeks/months based on filter).
   - Y1: views.
   - Y2 (optional): engagement.

2. **Performance by Pillar**
   - Type: bar chart.
   - X: pillar (`Body`, `Mind`, `Soul` or LBsWorks categories).
   - Y: views and/or engagement and/or avg engagement rate.

3. **Hook Type Performance**
   - Type: bar chart.
   - X: `hook_type` — **not a separately maintained field.** This pulls from whichever `hook_variants` row has `is_live = true` for that content item, the hook type of what was actually published, not a suggestion. If Claude Code builds a standalone `hook_type` field disconnected from the variants system, this chart will stay empty since nothing will populate it consistently, wire it directly to the live variant.
   - Y: avg retention / watch time / engagement per hook type.
   - **Phase dependency, worth knowing before building:** despite sitting in this "build first" list, this graph has no real data until Phase 2's Title/Hook/Thumbnail variants exist. Build the chart shell in Phase 1 if it's convenient, but it will show empty until Phase 2, that's expected, not broken. The other three graphs in this list have no such dependency and work from Phase 1 data alone.

4. **Pillar Balance / Consistency**
   - Type: ring or bar.
   - Shows post distribution across pillars in this period.
   - Flags over‑ or under‑posting (e.g., highlight if one pillar > 60% of posts).

### 6.4. Secondary Graphs (Add Later, Month 2–3+)

Once there's enough published content:

1. **Top Sub‑topics (Top 10)** – horizontal bar, by views/engagement.
2. **Content Output Volume Over Time** – bar chart, stacked by pillar.
3. **Funnel: Reach → Engagement → Conversion** – 3‑stage funnel.
4. **Top Performing Content (Top 5–10)** – table with thumbnails, metrics.
5. **Research‑based vs Custom Performance** – compare performance of research‑derived vs custom titles/hooks.
6. **Retention Drop Patterns** – not necessarily a chart; a list of recurring drop‑off moments across videos.
7. **Streak History** – GitHub‑style contribution heatmap from `daily_streaks`, optional, v2.
8. **Idea Source Performance** – bar chart, average views/engagement grouped by `idea_source` (Comment/DM/Mind/Competitor/Internet). This is the actual payoff of tracking source at all, over time it answers "do my best ideas actually come from audience comments, or is that just a feeling," with real numbers instead of a guess. *(new in v1.3)*
9. **Repurposing Performance** – compares original content against everything derived from it (`derived_from_content_id`), so it's clear whether atomizing a long-form video into shorts is actually working, and flags long-form pieces with zero derivatives as untapped repurposing opportunities. One of the highest-leverage growth levers among established creators, currently the biggest gap between "posting content" and "getting maximum mileage per piece." *(new in v1.3)*
10. **Best Time to Post** – average views/engagement grouped by day-of-week and time-of-day from `publish_time`, surfacing something like "Tuesday evenings consistently outperform" once there's enough volume to trust the pattern. *(new in v1.3)*

All graphs must be filterable by the global time filter.

***

## 6.5. Goals & Milestones *(new in v1.3)*

Genuinely absent until now, and worth having: everything else in this system tracks activity, this is the only place that tracks progress toward something. Ties directly back to the actual long-term vision behind this whole build, the Skool community down the line, real subscriber and revenue targets along the way.

Table: `goals`

Fields:

- `id`, `brand`
- `goal_text` (e.g., "Reach 10,000 subscribers", "First 50 Skool members")
- `target_metric` (select: Subscribers/Followers, Views, Revenue, Community Members, Custom)
- `target_value` (number)
- `current_value` (number — pulled automatically from Analytics where the metric is already tracked, e.g. subscriber count if available; manual entry otherwise)
- `target_date` (optional)
- `status` (On Track / Behind / Achieved / Abandoned)

UI: a small, always-visible progress strip, either on Analytics Overview or Today, whichever feels less cluttered once it's actually built. Not a big dashboard of its own, 2-3 active goals at a time is the realistic use case, not a sprawling goal-management system.

***

## 7. My Journey Log

A living journal, separate from content planning.

### 7.1. Fields (per entry)

- `date` (auto)
- `brand`
- `pillar_focus` (multi‑select: Body / Mind / Soul or LBsWorks categories)
- `sub_topic` (multi‑select, from fixed lists)
- `what_i_did_experienced` (text, multi‑line)
- `key_lesson_insight` (text, 1–3 lines)
- `proof_results` (text, optional)
- `mood_energy` (select: 1–5 or Low/Medium/High)
- `tags_keywords` (text, free)

### 7.2. Behavior

- Searchable/filterable by:
  - Date range
  - Pillar
  - Sub‑topic
  - Keywords/tags
- Used as source for:
  - `My Angle / Unique POV` in content items.
  - `Proof / Credibility` in content items.
- **Personal Angle Bank** is a filtered view of entries marked "angle‑worthy" (see Section 9).

***

## 8. Idea Panel (Lightweight Capture)

Fast front door for new ideas.

### 8.1. Fields

- `idea_title` (text)
- `brand`
- `pillar` (select)
- `sub_topic` (select)
- `format` (select: Reel / Short / Long Video / Post / Thread / Story / Other)
- `brief_description` (text, few lines)
- `reference_url` (text, optional)
- `idea_source` (select: Comment / DM / Mind / Competitor / Internet) — where the idea actually came from, not just what it's about. *(new in v1.3)*
- `source_detail` (text, optional) — the actual comment or DM text if that's the source, or a quick note on what a competitor did or what site/trend sparked it. This is what makes the tag genuinely useful later, "someone asked X" is worth far more than just knowing it came from a comment. *(new in v1.3)*
- `status` (select: Idea / Research / Ready to work)
- `migrated_to_content_id` (relation to `content_calendar`, optional)

### 8.2. Workflow

1. New idea captured here (fast, < 1 min).
2. When `status` → "Research", this **automatically creates a full `content_calendar` entry** (not optional, not minimal) — `research_snapshots` has a hard foreign key to `content_calendar`, and research populates full sections like the Viewer Research Panel (10.1.2), so a real row has to exist for research to have anywhere to write its results. The item's production status (10.1's header tracker) starts at **Idea**, the first stage, since nothing's been scripted yet. It won't necessarily show up in the main Content Calendar list view (10.0) until you've engaged with it further, that's a display choice, not a data one, the row is already real underneath.
3. When `status` → "Ready to work":
   - The full `content_calendar` entry already exists from step 2, nothing new to create here.
   - Set `migrated_to_content_id` on the idea.
   - Optionally hide or archive the idea in default views.

Idea Panel is **not** where deep research lives; that's in Content Calendar.

***

## 9. Personal Angle Bank

**⚠ Superseded, see `docs/topic-page-redesign.md`.** No longer a separate nav destination or section, merged into Journey Log as a toggle. The underlying `angle_worthy` field and filter logic below are still accurate, only the "separate page" framing is outdated.

A browsable collection of your best lived‑experience angles.

### 9.1. Implementation (Simplest)

- Add a checkbox to `journey_log`: `angle_worthy` (boolean).
- **Personal Angle Bank** view = all `journey_log` rows where `angle_worthy = true`, filtered by brand.

Fields shown:

- `date`
- `pillar_focus`
- `sub_topic`
- `key_lesson_insight`
- `proof_results`
- `tags_keywords`

### 9.2. Usage in Content Calendar

In `content_calendar`:

- Field `my_angle_unique_pov` can be:
  - Free text, or
  - A relation to one or more `journey_log` entries (or Angle Bank entries if you make a separate table).

For v1, free text plus a "Related Journey Entries" relation is enough.

***

## 10. Content Calendar

This is the core working area.

**⚠ Superseded, see `docs/topic-page-redesign.md`.** Section 10.1's five/six-section topic page structure below, and the 6-stage status tracker referenced in 10.0, are both outdated. The topic page is now two tabs (Research & Copy, Scripts), and production status is now a 4-stage taxonomy (Ready to Record / Scripted → Recorded → Editing → Published / Scheduled), decided directly with Claude Code and documented in the redesign file, not here. Sections 10.0's list view and sorting logic below are still accurate.

### 10.0. List View (Main Calendar Screen)

- **View type:** **Date‑based calendar**.
- View range selector at the top: **Week / Month / Custom** (pick a date range).
- Layout: infinite‑scrolling timeline (not a fixed grid).
- Each entry in the list shows four things, kept deliberately minimal:
  1. The Title (one line, truncated if long).
  2. The mini Production Status Tracker — **now 4 stages, see `docs/topic-page-redesign.md` and the taxonomy note there, not the 6-stage list this originally said.**
  3. The Pillar / Sub‑topic tag, sitting next to the status.
  4. **A small Viability Status dot** — green (Ready), amber (Waiting for Evidence / Needs More Time), grey (On Hold). *(new in v1.3)* This was a genuine gap: viability status previously only showed on the full topic page, meaning you'd have to open several items just to find one that's actually workable right now. The dot fixes that at a glance, no need to open anything.
- **Today's entry gets a subtle visual accent** (a 2px accent border and a small "Today" label) in the Week view, so the one day that's always more relevant than the rest of the list doesn't blend in with everything else. *(new in v1.3)*

- Sorting:
  - Primary sort: `publish_date`.
  - Secondary sort (optional): `sequence_step` / `sequence_order_custom` for display only.
- **Reordering:** entries are drag‑and‑drop reorderable directly in the list, for both brands, not just LBsWorks' sequence. Dragging an entry updates `publish_date` (moves it to that slot in the timeline) or `sequence_order_custom` (bumps its priority) depending on view — this is what lets a topic move up because real curiosity or demand shows up in research, without needing to edit a date field manually.

Nothing else. Title, research, variants, scripts — all hidden until you tap into the entry.

Tapping "More" or the entry itself opens the **Full Topic Page** below (10.1 onward).

This keeps the main Calendar screen fast to scan: a glance tells you what's coming up and where each piece stands, without any detail clutter. Detail only loads when you actually want to work on something.

### 10.1. Full Topic Page

Opened by tapping any entry. All six numbered subsections below (10.1.1–10.1.6) are individually collapsible, plus one master "Expand all / Collapse all" toggle at the top of the page. Numbered as 10.1.x specifically so they never collide with top-level document sections of the same number, e.g. this page's 10.1.2 (Viewer POV) is a different thing entirely from the document's own top-level Section 2 (Tech Stack).

#### Header (always visible, not collapsible)

- Final live title (`final_title`).
- **Production Status Tracker** — horizontal bar:
  - Idea → Scripting → Filming → Editing → Scheduled → Published.
  - Completed stages filled green with checkmark, current stage outlined, future stages grey/empty.
- **Viability Status** pill, separate from production stage:
  - Options: Ready / Waiting for Evidence / Needs More Time / On Hold.
  - With a short reason note.
- **Locked/Unlocked** indicator, if this topic has a prerequisite condition (mainly LBsTransformation):
  - Locked topics show greyed with a lock icon and the unlock condition.
  - Some unlock automatically via streak/tracker data, others manually.
- **Repurposing link**, shown both directions, whichever applies *(new in v1.3)*:
  - If this item has `derived_from_content_id` set: a small tappable line, "Repurposed from: [source title]", jumping straight to that source item's topic page.
  - If other items point to this one as their source: "Derivatives (3): [Short 1] · [Short 2] · [Short 3]", each tappable, so a long-form video's page shows everything that's been made from it at a glance, not buried in a report you'd have to go dig for.
  - Neither line shows if there's no repurposing relationship either direction, keeps the header clean for standalone content.

For LBsWorks V1–V8:

- No hard locks; sequence is **reorderable**.
- Use `sequence_step` and `sequence_order_custom` for ordering in Sequence View / Today, not for locking.

#### Copy‑Ready Panel (sits right under the header, always visible)

One‑tap‑to‑copy:

- Final Title
- Final Description
- Plain keyword tags
- Question‑style tags (phrased as real people search).

Auto‑populated from the top‑ranked research output, editable anytime.

#### 10.1.1. Creator Input (Internal)

Collapsible section.

Fields:

- `raw_idea_title`
- `raw_keywords_topics`
- `brief_intent` (2–4 lines)
- `content_angle_hook_direction`
- `reference_inspiration` (text + URLs)
- `target_stage_viewer_journey` (Awareness/Consideration/Decision)
- `my_angle_unique_pov` (pulled from Journey Log / Angle Bank)
- `proof_credibility` (pulled from Journey Log)
- `tone_style` (Friendly / Big Brother, Direct / No‑BS, Calm / Meditative, Energetic / Motivational, Story‑driven, Teaching / Explainer).
- `idea_source` and `source_detail` — carried forward automatically from the Idea Panel (Section 8.1) when it migrates here, editable if it needs correcting. *(new in v1.3)*

#### 10.1.2. Viewer POV (Audience‑Facing)

Collapsible section.

Fields:

- `viewer_problem` (1 line — must be clear before the idea is considered ready).
- `promise_outcome` (1 line).
- `final_title_hook`.
- `viewer_keywords_search_phrases`.
- `viewer_description` (1–2 lines).
- `primary_emotion_pain_point`.
- `objections_doubts` (2–4 bullets).
- `desired_action_cta`.

**Viewer Research Panel** (highlighted, sits beside this section):

- Real pulled evidence, sourced from the **latest `research_snapshots` row** for this topic:
  - Actual Reddit threads
  - Quora questions
  - Google "People Also Ask" phrasing
- Shown next to your own guessed keywords, so you can check your framing against real evidence before finalizing.

**Sub‑topic Completeness Checklist** (sits here in 10.1.2, tied to the research above):

- A short, auto‑generated checklist of the 3–5 specific angles this topic genuinely needs to feel complete, pulled from what's actually ranking and what people are actually asking, not a generic filler list.
- Field: `completeness_checklist` (text, checkbox list). Purpose: stop both under‑delivering on a topic and padding it out just to hit a length.
- Post‑publish, a quick self‑check: did the video actually hit these points, or wander off and leave a gap. This is what keeps trust intact on a daily-posting personal brand, half-delivering on a promised angle erodes trust fast.

**Audience Time‑Debt Indicator** (also here in 10.1.2):

- Field: `format_recommendation` (short/long, with a one-line reason) — given what the completeness checklist says this topic needs, does it honestly deserve a 60‑second short or the full long‑form treatment. Prevents cramming something that needs depth into 60 seconds, or stretching something simple into a long video that wastes the viewer's time.

**Direct‑Address Voice Rule** (standing rule, applies to every script, caption, and hook generated anywhere in the app, not a per‑topic field):

- All AI‑generated scripts, captions, hooks, and titles default to **singular direct address** — "you," never plural framing like "you guys" or "everyone struggles with this." Every line should read like it's aimed at one specific person going through exactly what you went through, not a broadcast to a crowd.
- This is a standing instruction baked into the AI provider's prompt (top-level Section 2, Tech Stack, not this local 10.1.2), not something to toggle per topic.
- **Confirmed for both brands.** Singular address doesn't conflict with LBsWorks' bold, direct tone, if anything it sharpens it, "you're about to waste six months on the wrong product" lands harder than "you guys."

#### 10.1.3. Research Output (Titles / Hooks / Tags / Thumbnails)

Collapsible section.

Every research pass auto‑generates 3 ranked options each for Title, Hook, and Thumbnail, tagged **Research‑based**. You can add your own **Custom** entries alongside them.

Each variant carries:

- `rank` (1/2/3, or unranked if custom).
- `source` (Research‑based / Custom).
- `performance_rating` (updated over time).
- `is_live` (boolean; whichever variant is promoted to "live" populates the Copy‑Ready panel). **UI action, not just a data flag:** each variant card carries a small "Use This" button. Tapping it sets that variant's `is_live` to true and every other variant of the same type (title/hook/thumbnail) on this item to false, a simple radio-style exclusivity, not a toggle you could accidentally leave two live at once. This single action is what drives the Copy-Ready panel, the Hook Library aggregation, and the repurposing header display, worth Claude Code treating it as one clear, central interaction, not an incidental checkbox.

For thumbnails specifically:

- `concept`
- `main_text_on_image`
- `visual_elements`
- `emotion_vibe`

Core tags (5–10) and detailed viewer‑search‑phrase tags (10–20, exact phrasing) also live here.

**Note on Refresh:** re‑running research (see 10.2.3) generates a *new* set of ranked Research‑based suggestions here. It appends alongside whatever's already in this section, it never deletes existing Custom entries or whichever variant is currently `is_live`.

#### 10.1.4. Publishing Ready (Per‑Platform)

Collapsible section.

For each platform (YouTube, Instagram, TikTok, Threads, Facebook):

- `platform_title`
- `platform_description`
- `platform_tags_hashtags`
- `platform_angle_line` (optional).

#### 10.1.5. Recording Section — Cue Cards *(new in v1.3)*

Collapsible section, sits after 10.1.4 (Publishing Ready) and before 10.1.6 (System & Production). This is separate from `script_outline_link` in 10.1.6, which points to an external doc — these two fields live inline on the page itself, specifically so recording never requires tabbing out mid‑take.

Fields on `content_calendar`:

- `main_pointers` — **not a flat text field, a structured list of point objects**, so each point can carry its own landing line and timing:
  - `point_text` — the essential thing to say, short phrase not full sentence.
  - `landing_line` (optional) — one saved phrase that closes this point cleanly. Drop into it anytime the point starts rambling, instant reset without needing a fresh take.
  - `runtime_estimate_seconds` (optional) — a rough seconds count, a felt sense of pacing without watching a timer, not a strict rule.
- `energy_tag` (select: Calm / Direct / High Energy / custom) — one word set before recording, shown prominently right at the top of this section, so you're primed for the right delivery the moment you hit record instead of adjusting tone mid‑take.
- `full_script` (text, long‑form) — a complete word‑for‑word script, including delivery notes: what to emphasize, what to avoid saying or doing on camera, pacing cues.
- `voice_memo_transcript` (text, timestamped) — the output of **voice‑memo‑first capture** (below).

**Voice‑memo‑first capture:** a "just talk" button that comes before any script exists. Tapping it records your voice like a normal voice memo, then converts it to text automatically. That raw, unscripted transcript becomes the material `main_pointers` gets structured from afterward, or you can work from it directly, flipping the usual order, talk first, structure comes after, rather than writing a script and performing it. Two implementation paths, worth deciding once you can hear real results: the browser's free built‑in speech recognition (works well indoors, can struggle with wind/traffic noise on outdoor walks) versus recording the full audio and sending it to a dedicated transcription service afterward (small added per‑use cost, meaningfully more reliable outdoors). Either way, the result is always editable text afterward, voice is the primary way in, typing is the fallback for fixing a garbled word, never the other way around.

UI: **Main Pointers** and **Full Script** stay two independent toggles, collapsed by default, plus the **energy tag** visible above both, and the **voice memo button** sitting at the very top of this section since it's meant to be the first thing you reach for, not something buried under the toggles. You choose per video which mode you're recording from; the dashboard never forces one style.

**Relationship to the Production Status Tracker:** this section is where the "Scripting" stage actually happens, building `main_pointers`, `full_script`, or the voice memo transcript is what moving a topic from Idea to Scripting means in practice. It stays relevant through "Filming" too, since the same cue cards are what you'd glance at while actually recording. Consider auto-expanding this section by default whenever a topic's status is Scripting or Filming, collapsed otherwise.

#### 10.1.6. System & Production + Competition Tracking

Collapsible section.

Fields:

- `pillar`
- `sub_topic`
- `format`
- `platform` (multi‑select)
- `publish_date` (date‑based; this drives the Calendar view).
- `sequence_step` (e.g. V1–V8 for LBsWorks, optional for LBsTransformation).
- `sequence_order_custom` (optional number; your manual reorder for Sequence View / Today).
- `script_outline_link` (external doc, e.g. a Google Doc — optional, in addition to the inline Recording Section above, not a replacement for it).
- `published_url`
- `performance_notes`
- `series_playlist`
- `search_demand_trend_signal`
- `benchmark_comparable_content` (2–3 links, legacy field; exists in the schema for backward compatibility, no dedicated UI built for it, `competitor_benchmarks` below is the real system, building throwaway UI for this first would just get discarded within a phase).
- `success_metric_focus` (Reach/Engagement/Retention/Conversion).
- `follow_up_content_ideas` (2–5 bullets).
- `analytics_review_date`.

Plus:

- `retention_drop_timestamp` (timestamp + short note on what was happening there). ⚠ Superseded: `content_calendar.retention_drop_timestamp` / `retention_drop_note` were dropped in `0023_drop_content_calendar_retention_drop.sql`. Retention drop is now one reading per platform check-in on `content_platform_stats_snapshots` (`0020_retention_drop_check_ins.sql`), entered in the topic page's "Log a check-in" form and trended in Analytics' Retention Drop Trends.
- `earned_the_click` (Yes / No / Unsure).
- `earned_click_note` (optional).
- `derived_from_content_id` (self‑referencing FK to `content_calendar`, optional) — **set manually, only on the derivative side, never the source side.** When editing a Short (or any repurposed piece), a search‑and‑select field lets you type the source video's title and pick it from matching results, that's the entire interaction. The long‑form source's "Derivatives" list is never edited directly, it's always computed by looking up which items point back to it, updating automatically the moment a Short links to it. Shown visibly in the topic page header both directions (see Header, above), not just stored invisibly. Powers the Repurposing Performance graph (Section 6.4). *(new in v1.3)*
- `publish_time` — `publish_date` should capture full date **and** time, not just date, this is what powers the Best Time to Post insight (Section 6.4) at essentially no extra cost, the data's already being entered. *(clarified in v1.3)*

**Competition Tracking (within 10.1.6)**

Add a child list/table: **`competitor_benchmarks`** (per content item).

Fields:

- `id`
- `content_id` (FK to `content_calendar`)
- `competitor_id` (FK to `competitors`, optional)
- `competitor_name` (text)
- `platform` (YouTube / IG / TikTok / etc.)
- `url`
- `why_benchmark` (text, 1 line: "better hook", "stronger CTA", "clearer promise")
- `notes` (text, optional)

UI behavior:

- In 10.1.6, show a small list titled **"Competitor Benchmarks"**.
- Each row:
  - Competitor name – Platform – "Why benchmark" – URL.
- You can:
  - Add new benchmarks directly here (free text competitor name).
  - Or select from existing competitors in the `competitors` table (if implemented).

This is where you do **per‑topic competition tracking**:

- For each video/post, you explicitly log 2–3 competitor pieces you're comparing yourself against.
- Later, you can review:
  - "For 'Confidence Habits' videos, I've benchmarked against Competitor A 4 times."
  - "My CTR is consistently lower than their average on similar topics."

### 10.2. Research Tabs (separate from the scrolling Sections above) *(new in v1.3)*

These sit as tabs on the topic page, alongside (not inside) 10.1.1–10.1.6, since they hold research evidence rather than editable content fields.

#### 10.2.1. Reference Videos Tab

For TikTok/Instagram links found during manual research (see Section 16 — no reliable API exists for these platforms).

Table: `reference_videos`

Fields:

- `id`
- `content_id` (FK to `content_calendar`)
- `brand`
- `url`
- `hook_note` (text, 1 line — what grabbed attention in the first few seconds)
- `rehook_note` (text, 1 line — what kept you watching mid‑video)
- `cta_note` (text, 1 line — what they said or showed at the end)
- `date_added` (auto)

UI: paste‑a‑link input at the top, each added link renders as its own card below with the three note fields. Cards stack, newest first. No limit on how many per topic.

#### 10.2.2. Potential Data Tab

The full, unfiltered research archive for this topic — not the processed summary that feeds 10.1.2/10.1.3, the raw evidence behind it.

Shows the **latest** `research_snapshots` row for this `content_id`, expanded in full:

- **YouTube** — top 10 ranking videos (title, channel, views, link), transcripts where available, hook/structure breakdown per video.
- **Google search behavior** — full autocomplete list, full "People Also Ask" list, related searches.
- **Reddit** — every relevant thread found (general search + named subreddits), each with title, excerpt, top comment excerpts, subreddit name, link.
- **Quora** — every relevant question found, with excerpt of top answer(s), link.
- **Reference Videos** — the manually‑added TikTok/IG links from 10.2.1 also surface here, so all research (automated and manual) is visible in one archive per topic.

Nothing here is trimmed or interpreted — this tab is deliberately raw, since it's the material a future guide or product would eventually be compiled from.

#### 10.2.3. History Tab + Refresh Research

**Refresh Research button** — sits at the top of the topic page (near the header). Re‑runs the full research pass (YouTube, Google, Reddit, Quora) and:

**If Reddit API access isn't available** (approval pending, denied, or simply not set up yet), the Reddit leg of this pass should not just silently skip. Fall back to a `site:reddit.com` query through the same SerpApi connection already used for Google search behavior research, this genuinely surfaces real Reddit threads and discussion titles without needing Reddit's own API at all, just without structured comment-level data (upvotes, exact comment threading). Lower-fidelity than the native API, but real, and costs nothing extra to build since SerpApi access already exists from day one of Phase 2. Worth building this as the default Reddit-research path from the start, not as an emergency fallback bolted on later if approval falls through. *(new in v1.3)*

- Inserts a **new row** into `research_snapshots` with `snapshot_date = now()`.
- Never deletes or edits any prior snapshot row.
- Regenerates a new set of ranked Research‑based Title/Hook/Thumbnail suggestions in 10.1.3 (appended, not replacing existing Custom or `is_live` entries).
- Updates the Viewer Research Panel in 10.1.2 and the Potential Data tab to reflect the newest snapshot.

**History Tab** — appears automatically once a topic has **2 or more** `research_snapshots` rows.

- Lists every past snapshot, most recent first, labeled by date (e.g. "Research from Aug 13", "Research from May 2").
- Tapping any past snapshot opens it read‑only, in the same layout as the Potential Data tab, exactly as it looked on that date.
- Purpose: comparing an old pull to a new one shows how the topic's conversation shifted over time — useful for deciding whether a topic's worth revisiting with a fresh angle, and for spotting long‑term pattern changes in your niche.

Table: `research_snapshots`

Fields:

- `id`
- `content_id` (FK to `content_calendar`)
- `brand`
- `snapshot_date` (auto)
- `youtube_data` (jsonb/text)
- `google_data` (jsonb/text)
- `reddit_data` (jsonb/text)
- `quora_data` (jsonb/text)
- `summary` (text — the condensed takeaways that feed the Viewer Research Panel and seed 10.1.3's ranked suggestions)

The **latest row by `snapshot_date`** is what powers the live 10.1.2 Viewer Research Panel and the Potential Data tab; all rows together power History.

***

## 11. Hook Library

An **automatic aggregation view**, not a manual‑entry space.

- Pulls every video's live hook variant (`hook_variants` where `is_live = true`) + its `performance_rating`.
- Shows performance grouped by type, e.g.:
  - "Relatable Callout — 9 uses, avg 74% watch time".
- Same logic applies to Title patterns and Thumbnail patterns, pulling from whichever variant is `is_live` on each published item.

No separate tables beyond `hook_variants` and fields on `content_calendar`.

***

## 12. Weekly Review (Sundays, 15–20 min)

Fixed 5‑item checklist, surfaced automatically in **Today** view on Sundays.

Stored in `weekly_reviews`:

Fields:

- `brand`
- `week_start_date`
- `week_end_date`
- `posted_as_planned` (notes).
- `pillar_balance_notes`.
- `retention_drop_patterns`.
- `hook_library_insights`.
- `earned_click_updates`.
- `next_week_adjustment` (one written line).

Checklist:

1. Scan this week's calendar entries — did you post what you planned.
2. Check pillar balance — is one pillar dominating or neglected.
3. Glance at retention drop notes — any repeat drop points.
4. Scan Hook Library — any hook type showing as a repeat winner.
5. Update "Did I Earn the Click" for last week's videos.
6. **Update view/engagement numbers for non-YouTube platforms** (TikTok, Instagram, Threads, Facebook) — this is the one place it actually happens. YouTube's own stats pull automatically, but nothing else does, without this weekly pass those numbers just stay blank forever, and every graph relying on them (Analytics Overview, Idea Source Performance, Repurposing Performance, Best Time to Post) goes quietly incomplete for anything not on YouTube. *(new in v1.3)*

Ends in one written line: **what to adjust next week**.
Missed weeks: just resume next Sunday, never combine two weeks into one session.

***

## 13. Quick Capture

**⚠ Superseded, see `docs/topic-page-redesign.md`.** No longer a separate page. Replaced by a quick-entry box directly on the Today page, saving straight into Journey Log. The migration-into-Ideas/Reference-Videos/Competitor-Benchmarks concept below no longer applies, the new version saves directly to Journey Log with no destination picker.

Always‑available inbox, separate from active topic research, for spontaneous viral finds **including competitor content**.

Fields:

- `url` (TikTok/IG/YouTube/etc.).
- `brand`.
- `pillar` (loose tag, not a specific sub‑topic yet).
- `quick_hook_notes`.
- `quick_rehook_notes`.
- `quick_cta_notes`.
- `content_type` (optional: "Competitor", "Inspiration", "Trend", "Other").
- `competitor_name` (optional, if this is a competitor piece).
- `status` (Inbox / Reviewed / Migrated).

Usage:

- When you see a strong competitor video/post:
  - Paste URL.
  - Tag `content_type = "Competitor"`.
  - Add notes: "Great hook in first 3s", "Steal for confidence topics", etc.
- When you see a strong non‑competitor reference video worth keeping for a specific topic's research:
  - Migrate it into that topic's `reference_videos` (10.2.1) rather than `competitor_benchmarks`.
- During Weekly Review or topic planning:
  - Move relevant items into:
    - `ideas` (if it sparks a new idea), or
    - `competitor_benchmarks` for a specific topic, or
    - `reference_videos` for a specific topic.

***

## 14. Competitors (Optional Tab, Recommended by v2)

This is an **overview layer** on top of the per‑topic benchmarks.

### 14.1. Data Model

Table: `competitors`

Fields:

- `id`
- `brand`
- `name` (e.g., "Competitor A")
- `platform` (YouTube / IG / TikTok / multiple)
- `channel_url` / `profile_url`
- `notes` (text, optional: "Strong hooks, weak CTAs", "Good storytelling", etc.)
- `active` (boolean, to hide old ones later)

Relation:

- `competitor_benchmarks.competitor_id` → `competitors.id` (optional).

### 14.2. UI (Competitors Tab)

When you open **Competitors**:

- List of competitors you're tracking (filtered by brand).
- For each competitor, show:
  - Name, platform, profile URL.
  - High‑level notes.
  - Count of times used as a benchmark (e.g., "Used in 12 topics").
  - Optionally, top sub‑topics where they're referenced.

This gives you a **high‑level competitor map**:

- "Competitor A is my main reference for Body topics."
- "Competitor B is mostly for Mind / confidence content."

For v1, you can implement this as a simple list. For v2, you can add:

- Filters by pillar/sub‑topic.
- Simple performance comparisons (e.g., "Avg CTR on topics where Competitor A is benchmarked").

### 14.3. Collaboration & Outreach Tracker *(new in v1.3)*

Mirrors the Competitors structure almost exactly, but for the opposite purpose, borrowed-audience growth through collaboration rather than benchmarking. Genuinely one of the fastest levers for growing an audience, worth tracking with the same discipline as competitors.

Table: `collaborators`

Fields:

- `id`
- `brand`
- `name`
- `platform` (YouTube / IG / TikTok / multiple)
- `profile_url`
- `status` (Identified / Reached Out / In Talks / Collaborated / Not a Fit)
- `notes` (text, optional — why they're a fit, audience overlap, what a collab could look like)
- `last_contact_date` (optional)

UI: same simple list pattern as Competitors (Section 14.2), filtered by brand, status visible at a glance so you can see who's genuinely in-progress versus just on the radar.

***

## 15. Pillar Tree (LBsTransformation) / Sequence View (LBsWorks)

### 15.1. LBsTransformation — Pillar Tree

Body / Mind / Soul, 5 branches each, visual tree with growing branches (react-d3-tree + Framer Motion for the real build). Tapping a branch reveals its topics. Locked topics show greyed with their unlock condition.

**Artistic direction, not just a node diagram** *(new in v1.3)*: branches should render as tapered filled shapes (thicker near the trunk, narrowing toward the tip), not uniform stroked lines, and splay at uneven angles and heights, the way a real tree actually grows, not five identical spokes off one point. Leaf tips are leaf-shaped (a simple pointed-oval silhouette), not plain circles or pills, filled solid for covered topics, hollow/outlined as closed buds for locked ones. The trunk can carry a subtle top-to-bottom color gradient (lighter near the top) as a quiet stand-in for growth over time.

**What gives it real feel, beyond the static shape:**
- A very slow, gentle sway on the branches (a few degrees of rotation, looping over 4-5 seconds), like the tree is breathing, not drawing attention, just not frozen.
- Unlocking a topic should **bloom**, not instantly flip states: the bud scaling up and filling with color over roughly half a second, so it reads as something happening, not a field toggling.
- Leaf size can scale slightly with how developed a topic is (research depth, personal angle filled in), a small visual reward for the work already done, not just a checkbox.

**Responsive behavior:** the organic branch curvature and leaf detail work well at full width, showing all three trees side by side. Below roughly 500px, that same detail reads as visual noise rather than character, switch to one tree at a time, swipeable between Body/Mind/Soul, keeping the organic branch shapes but simplifying how many individual leaves render at once until a branch is actually tapped into. Simplify for mobile, don't just shrink the same layout.

Locked structure (full detail, matching the final master doc):

- **BODY**
  1. **Fitness & Weight Loss** — training (gym/home), cardio, steps; fat loss, healthy weight gain/loss, calorie/protein basics, consistency
  2. **Physical Appearance & Physique** — building an aesthetic, athletic body; body composition, symmetry, overall look
  3. **Body Language & Posture** — posture correction, movement quality; confident stance, walk, sitting, gestures
  4. **Body Care & Skin Care** — skincare routine, hair loss recovery, sun protection; hair, beard, nails, hygiene, grooming
  5. **Longevity** — sleep, recovery, stress management; preventive health, sustainable habits, long-term health span; play, fun, hobbies, sports, and guilt-free rest

- **MIND**
  1. **Confidence & Personality** — social confidence, owning your presence; expressing your personality, humor, opinions; confidence and behavior online and on camera
  2. **Language & Social Dynamics** — learning a new language, articulation and fluency; conversation skills, listening, approaching, reading the room; choosing the right people, setting boundaries, building a supportive circle; noticing how your environment shapes your mindset
  3. **Positive Conditioning & Productivity** — habits, routines, focus, deep work; affirmations, visualization, environment design; using productivity to build meaningful work/craft; aligning money and career with your values
  4. **Self‑Image Building & Self‑Respect** — identity shift, how you talk to yourself; keeping promises to yourself, self‑trust and avoiding self‑sabotage
  5. **Self‑Moral Compass** — values, integrity, doing the right thing; responsibility, honesty, character; how you treat people online and offline; handling validation, comparison, and online behavior with integrity

- **SOUL**
  1. **Connecting to Oneself** — journaling, solo time, deep questions; knowing who you are beyond achievements
  2. **Self‑Satisfaction** — feeling enough, inner fulfillment; balancing ambition with contentment; allowing play, joy, and rest as part of a satisfied life
  3. **Mental Stability & Peacefulness (Meditation)** — meditation, breathing techniques; emotional regulation, calm under stress
  4. **Awareness & Presence** — mindfulness, noticing breath/body/thoughts; being present in daily activities
  5. **Purpose & Contribution** — your "why" behind all this work; using your growth to help/serve others; seeing work, money, and content as part of your purpose; building something meaningful that supports you and serves people

### 15.2. LBsWorks — Sequence View (Month One)

- Planned sequence: **V1 → V8**.
- Each video is a `content_calendar` entry with:
  - `sequence_step` (V1, V2, …).
  - `status`: Ready to make / Waiting on evidence (optional).
  - `evidence_condition` (text, optional, e.g. "3‑week Pinterest window").

- **Sequence is reorderable**:
  - You can drag‑and‑drop videos to change their working order.
  - A `sequence_order_custom` field stores your custom order.
  - **Today view** and **Sequence View** use your custom order if it exists, otherwise the default V1–V8 order.

- **No hard locks**:
  - You can record and publish out of sequence if you choose.
  - The sequence is a **planning aid**, not a technical constraint.

After Month One wraps: **LBsWorks — Pillar Tree (Build / Sell / Scale)**

Same tree UI pattern as Body/Mind/Soul (react-d3-tree + Framer Motion), but structurally different: branches per pillar are **uneven in count** (not a fixed 5), and each branch is an **open-ended topic-creation category**, not a fixed set of 5 items. New topics get added freely under a branch as the building actually happens, since categories like Build Logs or Experiments are inherently ongoing, not something you'd ever mark "complete."

Each pillar also carries a short **`viewer_takeaway`** tagline (new field on the pillar itself, not per-topic) — shown when you tap into that pillar in the tree, framing what the audience gets from that whole section.

**1. BUILD** — *"This shows me what to build, how to learn it, and how to actually start building, even from zero."*
- **Digital Products** — guides, templates, courses, toolkits, prompts; your journey learning to create and ship products
- **Apps & Tools** — micro-SaaS, simple apps, utilities; your plan and progress toward building your first app
- **AI Sites & AI Creators** — AI-powered content websites; AI creator accounts/channels; experiments and results as you learn
- **Services** — AI websites, automations, setups for clients (future); what you're learning now to offer this later
- **Stack & Tools** — tech stack decisions; AI, no-code, automation tools; how you choose tools as a learner/builder
- **Build Logs** — real projects: what you built, how, results, lessons; honest updates: wins, blockers, next steps

**2. SELL** — *"This shows me how to turn what I build into real income, even while I'm still learning."*
- **Monetization Paths** — products, services, apps, sites, AI creators, hybrids; your thinking and experiments as you learn
- **Offers & Positioning** — clear offers, positioning, differentiation; how you're learning to craft and test offers
- **Pricing** — how to price, tiers, bundles, bonuses; your pricing experiments and lessons
- **Business Models** — when to choose products vs services vs SaaS vs content; your decision process as you learn
- **Launch & Promotion** — simple launches, email, social, DMs for first sales; your first launches: what you tried, what worked

**3. SCALE** — *"This shows me how to grow my work without needing 10x more time, while learning and building in public."*
- **Audience & Content** — building an audience as a solo builder; content that attracts buyers, not just viewers; your journey growing an audience in public
- **SEO & Traffic** — AI-assisted keywords, posts, optimization; your experiments with AI content and SEO
- **Distribution & Repurposing** — 1 idea → many posts/platforms; automating distribution; your workflows and lessons
- **Email & Owned Audience** — newsletters, lead magnets, sequences; how you're building your own audience from scratch
- **Productivity & ROI** — focus, deep work, energy, priorities; doing the right work, not just more work; your systems as you learn and build
- **Automation & Systems** — workflows, automations (content, ops, delivery); your setup and iterations
- **Experiments** — testing new AI tools, channels, offers; "kill or scale" decisions; honest results and takeaways

Data model note: `pillar` on `content_calendar` becomes `Build` / `Sell` / `Scale` for LBsWorks topics created after Month One; `sub_topic` holds the branch name (e.g. `Build Logs`, `Pricing`, `Experiments`) freely, with no enforced count per branch.

***

## 16. Research Sources (Automated vs Manual)

**Status note:** the per-source SerpApi pull described below
(`searchGoogleSignals`, `searchRedditSignals`, `searchQuoraSignals` in
`src/lib/serpapi.ts`) is currently unused/dormant, not an active research
dependency. The actual research pipeline is the AI Research & Copy tab
(`docs/topic-page-redesign.md` Tab 1), which synthesizes research
directly via the Anthropic key rather than calling SerpApi per source.
The three functions are kept in the codebase, documented-dormant, in
case this per-source model is wanted back. `SERPAPI_KEY` itself stays
configured for an unrelated, still-active use: the System & Services
panel's Live Status account check.

- **Fully automatic:**
  - YouTube (top 10 videos, transcripts where available, hook/structure analysis, own channel stats). **Honest caveat:** not every video has an accessible transcript, and auto-generated ones can contain real errors. When a transcript isn't available, fall back to that video's title, description, and top comments for signal instead of silently returning less, and mark that video's entry as "no transcript" rather than leaving it ambiguous why the analysis is thinner.
  - Google search behavior (autocomplete, People Also Ask).
  - Reddit (general + named subreddits: r/selfimprovement, r/Fitness, r/Meditation, r/DecidingToBeBetter, r/productivity).

- **Automatic, with a caveat:**
  - Quora — no official public API exists, so this runs through general web search results picking up Quora pages, the same mechanism as "People Also Ask," rather than a dedicated integration. Functionally automatic, just less rock-solid than YouTube or Reddit's proper APIs.

- **Partially automatic:**
  - Pinterest (via third‑party trend tool).

- **Manual, by design:**
  - TikTok, Instagram Reels, Threads, Facebook.
  - Paste link into Reference Videos (10.2.1) or Quick Capture, fill Hook/Re‑hook/CTA yourself.
  - No reliable public API exists for these; building automation here would be a fragile dependency, not a real solution.

All automated sources write into a `research_snapshots` row (10.2.3) each time research runs or is refreshed.

***

## 17. Backup System

Two layers, working together, not one sheet trying to do everything: a **fast structured index** for quick scanning, and a **full-content archive** for anything genuinely too long for a spreadsheet cell to hold usefully. Plus a manifest, so the backup isn't just a copy of data, it's a system that explains itself to whatever connects to it next, human or AI.

- **Primary store:** Supabase.
- **Sync direction:** Supabase → both layers below (one‑way mirror, nightly).
- **Read‑only on both layers** — no edits happen outside Supabase.
- **Failure visibility:** the nightly sync logs its own success or failure (`backup_log` table already in the data model exists for exactly this). If a sync fails, retry once automatically; if it fails twice, surface a small visible warning in the dashboard ("backup hasn't synced since [date]") rather than failing silently for weeks unnoticed.
- **Execution model:** one function invocation per brand, not per run. A single brand's sync (full Drive archive + every Sheets tab) already runs close to Vercel's Hobby-plan 60s function ceiling, so both brands in one invocation reliably timed out, and did it silently (the brand that failed fast still logged its `backup_log` row; the other was killed mid-archive before it could log anything, so the dashboard saw only one brand failing when both were broken). Nightly: one Vercel Cron entry per brand (`/api/cron/backup?brand=<brand>`), staggered a few minutes apart so their Sheets writes don't compete for the 60-writes/min per-user quota. Manual: one "Sync now" button per brand on the Today-page backup panel. Sequencing the brands inside a single request is not a fix, they'd still share one 60s budget and the total only grows.
- **These two layers are reference and portability, not disaster recovery.** Real recovery from data loss or corruption relies on Supabase's own backups (point-in-time recovery / daily database backups), not on rebuilding the live database from Sheets or Drive. A "manual import from Sheets back into the dashboard" feature was scoped and deliberately not built: the export is lossy by design (nested structures are flattened to readable "key: value" joins, only a curated column subset per table reaches a cell) and carries no primary keys, so it can inform but never faithfully reconstruct live rows. The layers stay strictly one-way. If a genuine reference need ever arises (e.g. re-seeding a single lost Manual Workflow phase), the Drive archive's `raw_pasted_text` plus re-running the phase parser is the intended path, handled case by case, not a general restore mechanism.
- **Every tab carries `Created At` and `Updated At`** as its last two columns, read straight from each source row's `created_at` / `updated_at` (every table has both, trigger-maintained). This is a "when was this row last touched" scanning signal only; nothing reads it back.

### 17.1. Structured Index (Google Sheets)

One workbook per brand, one tab per table, for anything short enough to scan at a glance on your phone.

| Tab | Source table | What it holds |
|---|---|---|
| Journey Log | `journey_log` | date, pillar, sub-topic, what you did, key lesson, proof, mood, tags, angle-worthy flag |
| Ideas | `ideas` | idea title, pillar, sub-topic, format, brief description, reference URL, status |
| Content Calendar | `content_calendar` | title, viewer problem, promise, pillar/sub-topic, format, platform, publish date, production status, viability status, retention drop, earned-the-click, plus a **Full Detail Link** column (see 17.2) |
| Variants | `title_variants`, `hook_variants`, `thumbnail_variants` | combined into one tab with a `variant_type` column (Title/Hook/Thumbnail), one place to scan instead of three near-empty tabs |
| Reference Videos | `reference_videos` | content item, URL, hook note, re-hook note, CTA note, date added |
| Research Snapshots | `research_snapshots` | content item, snapshot date, the readable `summary` field, source counts (e.g. "12 YouTube videos, 34 Reddit threads, 8 Quora questions"), and a **Full Detail Link** column — the raw source data itself lives in 17.2, not crammed into a cell |
| Weekly Reviews | `weekly_reviews` | week dates, the five checklist notes, next-week adjustment line |
| Competitors | `competitors` | name, platform, profile URL, notes |
| Competitor Benchmarks | `competitor_benchmarks` | which content item, competitor, platform, URL, why it's a benchmark |
| Daily Streaks | `daily_streaks` | date, walked, posted |

### 17.2. Full‑Content Archive (Google Drive)

For anything genuinely too long to read comfortably in a cell, full research snapshot data (raw YouTube transcripts, Reddit threads, Quora questions), full scripts, and longer Journey Log entries, the nightly sync also writes a plain **Markdown file per entry** into a Drive folder, not a spreadsheet cell.

The archive write is the slow half of a brand's backup (a full Drive pass plus every Sheets tab has to finish inside one 60s function on Hobby). It is built to stay well under that: each folder is listed once up front into an in-memory index rather than one existence-check per file, and the per-item Markdown/JSON writes run with bounded concurrency (`src/lib/drive-archive.ts`). It stays an idempotent upsert, running it twice in a row leaves the exact same files with the same ids; the orphan sweep only trashes a name that isn't among the ones written this run, so a real row is never swept even mid-run.

Proposed structure (nest it under the existing Goddessify Content Library folder, or as its own root folder, whichever fits better on the day):

```
[Brand]-Dashboard-Backup/
  SYSTEM_MANIFEST.md
  content-calendar/
    [topic-title].md         → full brief: viewer problem, promise, angle, full script
  research-snapshots/
    [topic-title]/
      [date].md               → full readable research pull for that date
  journey-log/
    [month].md                → longer entries, batched by month
```

Each file is plain Markdown, readable by opening it directly in Drive, and just as easily read by any AI with Drive access, since Markdown is plain structured text, nothing proprietary to parse. This is what actually answers "can an AI extract from this later": pointing a future AI at this folder and asking "what did I cover about X three months ago" works far better against a folder of dated, readable files than against spreadsheet cells or a database it can't see into directly.

**Setup note:** Drive writes authenticate as your own Google account via OAuth (`GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` / `GOOGLE_OAUTH_REFRESH_TOKEN`), **not** the Sheets service account. Service accounts have no Drive storage quota of their own, so they can edit a file a human already shared with them (fine for Sheets, where the workbook already exists) but can't create the new files and folders the archive needs as topics accumulate. One-time setup: create an OAuth Client ID (Desktop app type) in the same Cloud project as the service account, then run `node scripts/get-drive-refresh-token.mjs`. See `docs/env-reference.md` and `src/lib/google-drive.ts`.

### 17.3. System Manifest

A living copy of this build spec sits at the root of the Drive archive as `SYSTEM_MANIFEST.md`, kept current as the system evolves. This is what directly answers the bigger question: if a completely new dashboard, or a different AI entirely, ever connects to this data, reading the manifest first tells it exactly what the system is, what each table and folder means, and how the whole workflow fits together, before it ever touches a row of data. The backup stops being just a copy and becomes a self‑contained, self‑explaining system, genuinely portable, not dependent on this specific build, this specific AI, or anyone's memory of how it was set up.

### 17.4. Data Lifecycle — Hot/Cold Archiving *(new in v1.3)*

Directly addresses the Supabase storage growth risk (Section 18): published content automatically moves between "hot" (full detail live in Supabase) and "cold" (full detail archived, lightweight index remains) on a rolling basis, using the Drive archive already built in 17.2 as the safe destination, nothing new to set up.

**The rule:** once a content item has been Published for 7 days, its heavy fields archive out of Supabase automatically. Opening it again retrieves full detail for another 7 days before it quietly re-archives if left untouched.

**Always stays in Supabase, regardless of archive state** (the lightweight index, needed so the Calendar and Analytics keep working across all‑time history, not just recent weeks):
- `title`, `viewer_problem`, `promise_outcome`, `pillar`, `sub_topic`, `format`, `platform`, `publish_date`
- production status, viability status
- performance metrics: views, engagement, conversions — **critical this never archives away**, the Analytics Overview's All‑time filter (Section 6.1) depends on this data staying queryable for every item ever published, not just the last week
- `earned_the_click` (retention drop moved to `content_platform_stats_snapshots`, see the ⚠ note earlier in this section)
- a reference to which variant is `is_live` (just the pointer, not the full variant history)

**Archives after 7 days** (cleared from Supabase, already safely duplicated in the Drive archive, nothing is lost, just relocated):
- `full_script`, detailed `main_pointers`
- `research_snapshots`' raw YouTube/Reddit/Quora data (the `summary` field can stay lightweight in the index, same split already used for the Sheets index in 17.1)
- non‑live title/hook/thumbnail variant history
- `reference_videos`' detailed notes

**Retrieve action:** opening an archived item's full detail (research, script, variants) fetches it back from the Drive archive into Supabase. New fields on `content_calendar`: `is_archived` (boolean), `last_active_at` (timestamp, set to `publish_date` initially, updated to `now()` on each retrieval, driving the next archive countdown).

**UI note:** archived items show a small indicator on the Content Calendar (Section 10.0) so a brief "retrieving..." moment on open isn't mistaken for something broken.

**Build phase:** Phase 2/3, this genuinely depends on the Drive archive (17.2) already existing before anything can be safely trimmed from Supabase.

This is your safety net — plain, readable, yours, independent of any single tool.

***

## 18. Recommended Stack (for the Desktop Build)

- **Frontend:** Next.js (React), hosted free on Vercel (Hobby tier covers a private solo dashboard comfortably).
- **Database:** Supabase (free tier — 500MB). **Being realistic, not optimistic:** 500MB is genuinely plenty for journal entries, ideas, and calendar fields, but `research_snapshots` stores full raw YouTube transcripts and Reddit threads, refreshed repeatedly across dozens of topics, that grows meaningfully faster than simple text content. If it becomes a real constraint months in, the Drive archive (Section 17.2) already holds the same full detail, so older raw snapshots can be trimmed from Supabase down to just the summary field without losing anything, Drive stays the permanent full record either way. Bundled Auth means no separate login service to build. Note: free-tier projects pause after 7 days of inactivity, which also pauses Auth — not a concern given daily use, but worth knowing.
- **Dashboard UI / Charts:** Tremor (free, Vercel-backed, built on Tailwind + Radix) for the Analytics Overview's KPI cards and graphs.
- **Tree visualization:** react-d3-tree (D3 tree layout, minimal custom code) + Framer Motion (animation) for the Pillar Tree.
- **General UI components:** shadcn/ui for buttons, dropdowns, modals, and other small interactive pieces.
- **Styling:** Tailwind CSS — the shared foundation under Tremor, shadcn/ui, and any custom components.
- **Backup:** Google Sheets API (service account auth) for the structured index, plus Google Drive API (OAuth as the account owner, not the service account, see Section 17.2) for the full-content Markdown archive, both via nightly scheduled sync (Section 17).
- **Privacy:** simple password or magic‑link login, private URL, not publicly discoverable.

***

## 19. Build Phases (Recommended)

**Two efficiency principles worth following throughout, not just in one place:**

1. **Build full schemas upfront, populate progressively.** Supabase tables and Sheets tab columns should include their eventual full field set from Phase 1, even fields that won't hold real data until Phase 2 or 3 (e.g. `is_archived`, `derived_from_content_id`, the Sheets index's "Full Detail Link" column). Empty fields waiting for later data cost nothing. Adding columns to a live table or spreadsheet later is genuinely more disruptive, this avoids schema migrations entirely.
2. **Don't build UI for anything already known to be superseded within a phase or two.** If a field is explicitly legacy or a placeholder for a fuller system arriving soon (see `benchmark_comparable_content` below), skip building dedicated UI for it, let it exist in the schema only, and go straight to the real version when its phase arrives. Building throwaway UI wastes a full build cycle for something that gets discarded almost immediately.

### Phase 1 — Core

- Auth + Brand Switcher.
- Content Calendar (list view + full topic page, at least 10.1.1–10.1.6).
- Recording Section (`main_pointers`, `full_script`) — core to daily use, no research dependency. *(new in v1.3)*
- `daily_streaks` table + simple streak counter in Today view. *(new in v1.3)*
- System & Services panel, static reference version (Section 5.3) — just the table, no live checking yet. *(new in v1.3)*
- My Journey Log.
- Basic Analytics Overview — 3 of the 4 "core" graphs work from Phase 1 data alone (Content Performance Over Time, Performance by Pillar, Pillar Balance/Consistency); Hook Type Performance's chart shell can be built now but stays empty until Phase 2 (see the note in Section 6.3).
- Backup to Google Sheets — structured index only (Section 17.1).

### Phase 2 — Flow & Research

- Idea Panel.
- Research automation (YouTube, Google, Reddit, Quora) → writes to `research_snapshots`. *(updated in v1.3)*
- Potential Data tab + History tab + Refresh Research button (10.2.2, 10.2.3). *(new in v1.3)*
- Reference Videos tab (10.2.1). *(new in v1.3)*
- Title/Hook/Thumbnail variants + Copy‑Ready Panel.
- **Full‑content Drive archive + System Manifest (Section 17.2, 17.3)** — this is when raw research first gets long enough to need it; set up Drive OAuth (owner account, not the service account, see Section 17.2) and start writing full‑detail Markdown files. *(new in v1.3)*
- Hot/cold archiving lifecycle (Section 17.4) — depends on the Drive archive above already existing; can land in Phase 2 alongside it or slip to Phase 3, whichever fits the pace of the build. *(new in v1.3)*
- Structured competition tracking:
  - `competitor_benchmarks` child table in 10.1.6.
  - Optional `competitors` table + **Competitors** tab (simple list).
- `goals` table + simple progress display (Section 6.5) — no blocking dependency, works from Phase 1's Analytics data (views/engagement already tracked), placed here rather than Phase 1 since it's a strategic-tracking nicety, not day-one core. *(new in v1.3)*
- `collaborators` table + Collaboration & Outreach tab (Section 14.3) — same complexity as Competitors above, natural to build alongside it. *(new in v1.3)*

### Phase 3 — Advanced

- Hook Library.
- Personal Angle Bank.
- Pillar Tree / Sequence View.
- Weekly Review.
- Quick Capture (with explicit competitor tagging, and migration into Reference Videos).
- Secondary graphs and pattern surfaces, including Streak History heatmap.
- System & Services panel, live status enhancement (Section 5.3) — pull real usage numbers where each provider allows it (Supabase storage, YouTube quota, SerpApi searches remaining). *(new in v1.3)*
- System & Services panel, "Check Alternatives" one-tap research per service (Section 5.3) — reuses the existing SERP API + AI provider to compare current alternatives, informational only, never auto-switches anything. *(new in v1.3)*
- Enhanced Competitors view (filters, simple comparisons).

***

## 20. Confirmation of Key Flow Decisions

1. **New ideas start in Idea Panel (light capture), not in the full 9‑field Creator Input section.**
   - Fast capture first.
   - Full 5‑section topic page only when marked "Ready to work".

2. **Content Calendar is date‑based; Sequence View is order‑based.**
   - Calendar sorts by `publish_date`.
   - Sequence View / Today sort by `sequence_step` / `sequence_order_custom`.
   - Same underlying `content_calendar` table; different views and sort logic.

3. **LBsWorks V1–V8 is a flexible sequence, not a hard lock.**
   - Reorderable at any time.
   - No system‑enforced dependency preventing out‑of‑sequence recording or publishing.

4. **Competition tracking lives in:**
   - **Content Calendar → 10.1.6** → `competitor_benchmarks` (per topic).
   - **Quick Capture** → competitor links tagged as "Competitor".
   - **Competitors tab** (optional v2) → high‑level overview of tracked competitors.

5. **Research is append‑only and versioned.** *(new in v1.3)*
   - Refresh Research always inserts a new `research_snapshots` row; it never edits or deletes a prior one.
   - The Potential Data tab always reflects the latest snapshot; the History tab holds every snapshot, viewable independently.

6. **Recording fields are inline, not just an external link.** *(new in v1.3)*
   - `main_pointers` and `full_script` live directly on the content item.
   - `script_outline_link` (10.1.6) remains available for anyone who still wants an external doc, but it's additive, not a dependency for recording.

Build accordingly.

***

## 21. Changelog Detail (v1.2 → v1.3)

Five gaps identified against the full prior planning conversation, now closed:

1. **Reference Videos** — new `reference_videos` table + tab (10.2.1); manual TikTok/IG research now has a defined home instead of living only in Quick Capture notes.
2. **Potential Data tab** — new `research_snapshots` table powers a full raw‑evidence archive per topic (10.2.2), separate from the processed Section 2/3 output.
3. **History tab + Refresh Research** — versioned, append‑only research snapshots (10.2.3); refreshing a topic's research now preserves every prior pull for comparison rather than overwriting it.
4. **Recording Section (cue cards)** — `main_pointers` and `full_script` added as inline fields, distinct from the external `script_outline_link`, so recording never requires leaving the app.
5. **Daily Streaks** — new `daily_streaks` table, surfaced in Today view (5.0) and as an Analytics KPI/graph (6.2, 6.4), tying the daily walk/posting habit directly into the system.
6. **Tech stack refinement** (Sections 2, 18) — added Tremor (pre-styled dashboard/KPI/chart components, free and Vercel-backed) for the Analytics Overview, and swapped raw D3.js for react-d3-tree for the Pillar Tree, keeping the same visual result with far less custom code. Added shadcn/ui for general interactive components. Core foundation (Next.js, Vercel, Supabase, Tailwind) unchanged.
7. **LBsWorks post-Month-One Pillar Tree locked** (Section 15.2) — Build / Sell / Scale, 18 branches total (6/5/7), each branch an open-ended topic-creation category rather than a fixed 5, since ongoing categories like Build Logs and Experiments don't have a natural "complete" state. Each pillar carries a short viewer-facing tagline.
8. **Prerequisites checklist added** (Section 2.5) — every account, API key, and service needed before Phase 1 and Phase 2, grouped by when it's actually needed.
9. **AI provider made explicitly swappable** (Sections 2, 2.5) — all AI calls route through one internal function rather than being scattered through the app, so the underlying model (Claude, Gemini, GPT, or anything else) can be swapped by changing one file and one API key. No vendor lock-in on which company powers research synthesis and suggestion ranking.
10. **Backup redesigned as two layers** (Section 17) — first fixed from one flat generic sheet to one workbook per brand with a clearly-named tab per table (17.1). Then extended further: full-length content (raw research, full scripts) that doesn't fit a cell now writes to a Google Drive Markdown archive instead (17.2), cross-linked from the Sheets index. A System Manifest (17.3), a living copy of this spec, sits at the root of that archive, so the backup isn't just data anymore, it's self-explaining to any new dashboard or AI that connects to it later.
11. **Full audit pass against the entire planning conversation** — found and fixed five real gaps: (a) Section 15.1's Body/Mind/Soul structure had reverted to an earlier, simpler version and was missing enriched detail from the actual final master doc (play/hobbies under Longevity, online-behavior integrity under Confidence and Self-Moral Compass, boundaries/environment under Language & Social Dynamics, money/career alignment under Positive Conditioning and Purpose & Contribution); (b) Section 16 listed Quora as "fully automatic" while Sections 2.5 and 10.2.2 correctly flagged it has no official API, now consistent everywhere; (c) drag-to-reorder was confirmed in conversation for both brands' calendars but missing from Section 10.0's list view; (d) the Sub-topic Completeness Checklist and Audience Time-Debt Indicator were discussed and confirmed but absent from the document, now in 10.1.2 (Viewer POV); (e) the Direct-Address Voice Rule ("you," never "you guys") was confirmed as a standing rule but undocumented, now in 10.1.2 as a standing AI-prompt instruction. Section 0's overview line also still referenced Sheets-only backup after the two-layer redesign; fixed to match.

12. **Full record mode added to the Recording Section** (previously flagged as unconfirmed, now resolved) — `main_pointers` restructured from flat text into a list of point objects, each with an optional landing line and runtime estimate; added an `energy_tag` field shown before recording; added voice‑memo‑first capture (`voice_memo_transcript`), with an honest note on the indoor‑vs‑outdoor transcription tradeoff given recording happens on walks, and a clear default: voice is the primary input, typing is the fallback for corrections, never the reverse.
13. **UX Principles section added** (4.3) — global search across topics/journal/hooks/research, a persistent quick-add reachable from any screen, one fixed color per pillar used everywhere, Today as the permanent landing screen, breadcrumb navigation, persistent filters, guided empty states, and a recently-viewed quick-jump list. These are cross-cutting rules, not tied to any one section, meant to keep the app fast to navigate and light to look at even as the amount of content grows.
14. **Risk and failure-mode audit** — went looking specifically for what could break or underdeliver, not just what was missing. Found and fixed six real issues: (a) YouTube transcripts aren't universally available, added a fallback to title/description/comments when one's missing (Section 16); (b) the AI generating research suggestions had no instruction to flag thin, low-confidence research rather than producing confident-sounding fabrication, added an explicit guardrail (Section 2); (c) the SERP API's free tier was framed too optimistically given realistic refresh volume, corrected (Section 2.5); (d) `hook_type` was referenced for the Hook Library chart with no actual wiring to populate it, now explicitly pulls from whichever variant is `is_live` (Sections 6.3, 11); (e) the nightly backup sync had no failure handling, a silent failure could go unnoticed for weeks, added retry-once-then-warn behavior using the already-existing `backup_log` table (Section 17); (f) Supabase's 500MB was framed as "plenty" without accounting for full raw research transcripts accumulating over time, corrected with a realistic growth note and a trim-to-Drive mitigation path (Section 18). Also restored the tree-visualization graceful-fallback note (Section 2) that was discussed early in planning but never made it into any prior version of this document.
15. **System & Services Panel added** (5.3) — a collapsible section at the bottom of Today, collapsed by default, listing every backend dependency (Supabase, Vercel, GitHub, Google Sheets/Drive, YouTube API, Reddit API, SERP API, AI provider) with what it powers, its cost tier, and swap alternatives, matching the swappable-architecture philosophy already established. Static reference table ships in Phase 1; live usage numbers (storage %, quota remaining, searches used) pull in as a Phase 3 enhancement where each provider's own API allows it. Also added a one-tap **"Check Alternatives"** action per service (Phase 3), reusing the existing SERP API and AI provider, no new dependency, to research current competitors and return a dated, plain verdict (switch, stay, or test first). Purely informational, any real migration stays a manual decision. This whole panel is the in-app companion to the System Manifest (17.3): the manifest is for a new system reading the data cold, this panel is for staying informed day to day without hunting across provider dashboards.
16. **Post-addition verification pass** — checked the new table against the rest of the document rather than assuming it was consistent. Found two real contradictions: `service_alternative_checks` was documented in Section 5.3 but absent from Section 3's actual table list (now table 14, explicitly flagged as the one exception to brand-scoping), and Section 1's blanket "every record has a brand field" rule directly contradicted that exception (now notes it inline, where the rule is first stated, not buried later). Also added the System & Services Panel to Section 0's top-level overview, since it had grown into a substantial feature without a mention there. Full structural check afterward confirmed section numbering (0 through 21, 23 sections total), table counts, and the document's ending are all clean.
17. **Direct-Address Voice Rule confirmed for both brands** (top-level Section 2, Tech Stack, and 10.1.2 on the topic page) — this had been flagged as an unconfirmed scope assumption in the previous pass; now explicitly confirmed rather than left as an inference.
18. **Hot/cold archiving lifecycle added** (17.4) — directly solves the Supabase storage growth risk flagged in the risk audit (item 14 above), using the Drive archive already built in 17.2 rather than any new infrastructure. Published content archives its heavy fields (full script, raw research, non-live variant history) out of Supabase 7 days after publish, keeping only the lightweight index, title, dates, status, and critically, performance metrics, which must never archive away since Analytics' All-time filter depends on them. A one-tap retrieve brings full detail back for another 7-day window if needed again. New fields `is_archived` and `last_active_at` on `content_calendar`.
19. **Idea source tracking added** (Section 8.1, carried into 10.1.1 on the topic page) — `idea_source` (Comment/DM/Mind/Competitor/Internet) and `source_detail` (the actual comment/DM text or a quick note) capture where an idea genuinely came from, not just what it's about. Feeds a new **Idea Source Performance** graph (Section 6.4) so which sources actually produce the best content becomes a real, checkable pattern rather than a guess. Note: "Competitor" was an interpretation of an ambiguous word in the original request, flagged to the user and confirmed correct.
20. **Section-numbering collision fixed** — the topic page's five local field sections were named "Section 1" through "Section 5," identical to the document's own top-level Section 1 through 5, which describe completely different things (High-Level Requirements vs Creator Input, Tech Stack vs Viewer POV, and so on). This caused real, demonstrated confusion: over a dozen cross-references throughout the document were ambiguous or outright wrong about which "Section 2" or "Section 5" they meant, including a mistake made in this document's own earlier changelog entries. Renumbered the topic page's subsections as **10.1.1 through 10.1.6** (Recording Section now included in the count), matching the hierarchical pattern already used for the Research Tabs (10.2.1–10.2.3), and corrected every cross-reference in the document to point to the right one. A reference to "Section 2" now unambiguously means one thing, not two.
21. **Build-order contradiction found and fixed** — Section 6.3 is labeled "Core Graphs (Build First)" and Phase 1 pointed at it, but one of its four graphs, Hook Type Performance, depends on `hook_variants` with `is_live` flags, which don't exist until Phase 2's Title/Hook/Thumbnail variants are built. Following the label literally in Phase 1 would have produced an empty, unexplained chart. Now explicitly flagged inline as Phase 2-dependent, and Phase 1's build list clarified to name the 3 graphs that genuinely work from Phase 1 data alone. Also caught two leftover "Sections 1–5" references missed during the renumbering fix above, corrected to 10.1.1–10.1.6.
22. **Growth features added** — four things absent that matter specifically for growth, not organization: **Goals & Milestones** (6.5), a lightweight progress tracker tying real targets to the long-term Skool community vision behind this whole build; **Collaboration & Outreach tracker** (14.3), mirroring the existing Competitors structure but for borrowed-audience growth through partnerships; **Repurposing Performance** (`derived_from_content_id` on `content_calendar`, graph in 6.4), linking derivative short-form content back to its long-form source and flagging pieces with zero derivatives as untapped atomization opportunities, one of the highest-leverage tactics among established creators, shown visibly both directions right in the topic page header ("Repurposed from: X" on the short, "Derivatives (3): X, Y, Z" on the source), not just an invisible link only surfacing in a monthly report; and **Best Time to Post** (6.4), a pattern surface over `publish_time` data the system is already collecting, at essentially no extra entry cost.
23. **Full phase sequencing check** — traced every single feature's actual data dependencies against Build Phases (Section 19) rather than trusting the labels. Found two real gaps: Goals & Milestones and the Collaboration & Outreach tracker were both fully specified elsewhere in the document but never actually added to any phase's build list, only mentioned in changelog narrative, both now explicitly placed in Phase 2 alongside Competitors, since neither has a blocking dependency and both fit naturally there. Also confirmed everything else already correctly sequenced: the repurposing link, `publish_time`, and `derived_from_content_id` all live in 10.1.6, correctly Phase 1; their aggregate graphs correctly wait in Phase 3's secondary-graphs bucket since they need volume regardless of when the underlying field was added; "Check Alternatives" correctly sits in Phase 3, after its SERP API dependency lands in Phase 2. One graceful-degradation note added: the Search Everywhere principle's full scope depends on Phase 2 tables (`hook_variants`, `research_snapshots`), so it naturally searches fewer sources in Phase 1 and more from Phase 2 onward, this isn't broken, just worth stating rather than leaving implicit.
24. **Build efficiency pass** — looked specifically for wasted effort, not just correctness: places where Phase 1 work would get reworked or discarded once a later phase landed. Found one real case: Phase 1's build list included dedicated UI for `benchmark_comparable_content`, a field already labeled legacy in its own field definition, immediately superseded by Phase 2's real `competitor_benchmarks` child table and UI. Removed the throwaway build, the field now exists in the schema only, with no UI ever built for it, going straight to the real system when Phase 2 arrives. Added two standing principles to the Build Phases intro (Section 19) to prevent this pattern recurring: build full schemas upfront across all phases so later phases populate existing empty fields rather than requiring schema migrations, and never build dedicated UI for anything already known to be superseded within a phase or two.
25. **Workflow trace pass** — walked the actual end-to-end user journeys (idea → research → production → publish → archive → review) rather than checking individual features in isolation, found three real hand-off gaps. (a) The Idea Panel's step 2 said research "optionally" creates a "minimal" content_calendar row, but `research_snapshots.content_id` is a hard foreign key to `content_calendar`, and research populates full sections like the Viewer Research Panel, so the row is neither optional nor minimal, it's required and full; fixed the wording (8.2) and added that a freshly-migrated item's production status starts at Idea. (b) `is_live`, the flag driving the Copy-Ready panel, Hook Library aggregation, and the repurposing header display, was referenced everywhere as a data flag but never given an actual UI action; added an explicit "Use This" button per variant (10.1.3) with radio-style exclusivity, one live variant per type at a time. (c) Nothing described how view and engagement numbers get updated for non-YouTube platforms after publishing, YouTube pulls automatically but TikTok, Instagram, Threads, and Facebook had no described mechanism at all; added as a 6th Weekly Review checklist item (Section 12), since without it those numbers stay permanently blank and every graph depending on them (Analytics Overview, Idea Source Performance, Repurposing Performance, Best Time to Post) quietly goes incomplete for anything not on YouTube.
26. **Design pass on Today and the Content Calendar** — applied actual visual hierarchy rather than just listing components. Today (Section 5): streak numbers now explicitly quiet/small (motivational context, not the task), the next-up suggestion is the clear colored hero card, a second option (if shown) sits visibly quieter below it, System & Services stays collapsed at the very bottom. Content Calendar (10.0): found a genuine usability gap while designing this, viability status (Ready/Waiting/On Hold) previously only appeared on the full topic page, meaning you'd have to open several items just to find one actually workable right now; added a small color dot (green/amber/grey) to every card in the list, visible without opening anything. Also added a subtle accent border and label on today's entry specifically in the Week view, since it's always more relevant than the rest of the list and shouldn't blend in.
27. **Artistic design pass on the Pillar Tree** (15.1) — moved from a generic node diagram to real illustrative direction. Branches specified as tapered, filled organic shapes at uneven angles and heights, not uniform stroked spokes off one point. Leaf tips are actual leaf silhouettes, solid-filled for covered topics, hollow outlined buds for locked ones, not plain pills or circles. Trunk carries a subtle top-to-bottom gradient as a quiet stand-in for growth over time. Added real-feel guidance beyond the static shape: a slow, gentle branch sway (Framer Motion, a few degrees, 4-5 second loop), a bloom animation when a topic unlocks rather than an instant state flip, and leaf size scaling slightly with how developed a topic's research and personal angle are. Added responsive guidance: full detail and all three trees side by side above roughly 500px width, one tree at a time, swipeable, with simplified leaf count below that, since the same organic detail reads as noise rather than character at small sizes.

This is your **final, ready‑to‑ship spec (v1.3)**. You can hand this to a developer or AI code generator and say:
**"Build exactly this, in phases as described."**
