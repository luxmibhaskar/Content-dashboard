# Environment Variables Reference

What each credential in `.env.local` actually does. Keep this in `docs/`
alongside `builder-brief.md` for later reference, none of the real values
belong in this file, just the explanations.

## Supabase (database)

**NEXT_PUBLIC_SUPABASE_URL**
The web address of your Supabase project, where your database actually
lives. The app uses this to know where to send every request. Safe to be
public, that's what the `NEXT_PUBLIC_` prefix means, it's fine for this to
be visible in browser code.

**NEXT_PUBLIC_SUPABASE_ANON_KEY**
The "publishable" key (Supabase's newer name for what used to be called
the anon key). Identifies your app to Supabase, safe to use in the
browser. On its own it doesn't grant broad access, actual permissions are
controlled separately by Row Level Security rules on each table.

**SUPABASE_SERVICE_ROLE_KEY**
The "secret" key, full admin access, bypasses all security rules
entirely. Server-side only, never sent to a browser, never exposed
anywhere public. The one credential here worth guarding most carefully,
whoever has this can read or change anything in the database.

## Anthropic (AI provider)

**ANTHROPIC_API_KEY**
Lets the dashboard call Claude directly for AI-powered features: research
synthesis, generating Title/Hook/Thumbnail suggestions, and similar.
Billed per use from your prepaid credit balance, not a subscription, and
capped at whatever's actually loaded onto the account as long as
auto-reload stays off.

## Google (Sheets + Drive backup)

**GOOGLE_SERVICE_ACCOUNT_EMAIL**
The email address of the "robot" identity Google Cloud created. This is
the exact address the backup Google Sheet was shared with, which is what
gives the app permission to write to it, same as sharing with a
colleague, except this "colleague" is code. Sheets only: the Drive
archive doesn't use this identity at all (see the `GOOGLE_OAUTH_*` vars
below), so the Drive backup folders don't need to be shared with it.

**GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY**
The private credential that proves to Google's servers that a request
really is coming from that service account. Comes from the JSON file
downloaded during setup, always used together with the email above, one
doesn't work without the other. Sheets only: the Drive archive
authenticates as a real Google account via OAuth instead (see the
`GOOGLE_OAUTH_*` vars below and `src/lib/google-drive.ts`), so this key
is never parsed on the Drive path. A mis-pasted value here (wrapping
quotes left in, `\n` not converted to real newlines, stray carriage
returns) surfaces only as `error:1E08010C:DECODER routines::unsupported`
from the Sheets sync; `getAuth()` in `src/lib/google-sheets.ts`
normalizes the common cases, but the value in the Vercel dashboard
should still be the raw PEM with real newlines.

**GOOGLE_SHEETS_BACKUP_ID_LBSTRANSFORMATION** /
**GOOGLE_SHEETS_BACKUP_ID_LBSWORKS**
Tell the app exactly which Google Sheet to write each brand's backup
into, one workbook per brand per builder-brief.md Section 17.1, each
pulled directly from that Sheet's own URL. Without these, the app
would have the right permissions but no idea which specific sheet to
use for which brand.

**GOOGLE_DRIVE_BACKUP_FOLDER_ID_LBSTRANSFORMATION** /
**GOOGLE_DRIVE_BACKUP_FOLDER_ID_LBSWORKS**
Tell the app which Drive folder holds each brand's full-content archive
(builder-brief.md Section 17.2), full scripts, full research pulls,
longer Journey Log entries, anything too long for a spreadsheet cell,
plus the living SYSTEM_MANIFEST.md at its root. Create a folder per
brand in your own Drive and paste its ID here from its URL, no sharing
needed since Drive writes run as you, not the service account (see
below).

**GOOGLE_OAUTH_CLIENT_ID** / **GOOGLE_OAUTH_CLIENT_SECRET** /
**GOOGLE_OAUTH_REFRESH_TOKEN**
Drive-specific auth, separate from the service account used for Sheets.
Service accounts have no storage quota of their own, they can edit a
file a human already shared with them (that's how Sheets works, no new
file ever gets created there) but can't create new files or folders,
which the Drive archive needs continuously as topics and snapshots
accumulate. So Drive writes authenticate as your own Google account via
OAuth instead. One-time setup: create an OAuth Client ID (Desktop app
type) in the same Google Cloud project as the service account, put its
Client ID and Secret here, then run
`node scripts/get-drive-refresh-token.mjs` and follow the printed
instructions to get the refresh token. Only needs redoing if the token
is ever revoked.

## YouTube

**YOUTUBE_API_KEY**
One Data API v3 key, three uses now:

1. **Research tab video pull**: search for the top 10 videos matching a
   topic's title, their view counts, descriptions, and top comments.
   Doesn't grant access to real transcripts, captions.download requires
   OAuth consent from the video's own channel owner, not available for
   other people's videos with just an API key, so title/description/
   comments are the actual signal this pulls, not a fallback for when a
   transcript happens to be missing.
2. **Platform-goal subscriber count (Group J)**: `fetchYouTubeChannelStats`
   (`src/lib/youtube.ts`) resolves a channel id / `@handle` (stored in
   `goals.source_ref`) to a live subscriber count, upserted into
   `platform_snapshots`. Triggered by the "Refresh from YouTube" button
   on the YouTube platform-goal card and nightly by the backup cron (see
   CRON_SECRET below).
3. **Own-video stats (Group I)**: `fetchYouTubeVideoStats`
   (`src/lib/youtube.ts`) pulls view/like/comment counts for a published
   topic's YouTube video via its pasted `content_platform_posts.post_url`,
   into `content_platform_stats_snapshots`. Button-only, on the topic
   page's per-platform Analytics card.

Free within the standard daily quota; all three uses together are a
handful of calls a day at solo volume.

## SerpApi (currently unused/dormant)

**SERPAPI_KEY**
Not an active research dependency right now. The Google/Reddit/Quora
per-source pull this key was originally built for (`searchGoogleSignals`,
`searchRedditSignals`, `searchQuoraSignals` in `src/lib/serpapi.ts`) has
no caller anywhere in the app, research now runs entirely through the AI
Research & Copy tab (`docs/topic-page-redesign.md` Tab 1), which
synthesizes research via the Anthropic key above instead of calling
SerpApi per source. Those three functions are kept in the codebase,
documented-dormant, in case that per-source model is wanted back.

The key is still read in one place: the System & Services panel's Live
Status check (`getSerpApiLiveStatus`) pings SerpApi's own account
endpoint to show searches remaining, so the key stays worth keeping
configured even while the research pull itself is dormant.

## Backup automation

**CRON_SECRET**
A shared password that proves a request to `/api/cron/backup` really
came from Vercel's scheduled Cron job, not some random visitor hitting
the URL. Any string works, generated once and reused, set the same
value here and in the Vercel project's env vars after deploying. The
endpoint runs one brand per call: `vercel.json` schedules it twice,
`?brand=lbstransformation` and `?brand=lbsworks`, a few minutes apart,
so each brand's sync gets its own function time budget instead of both
racing one 60s Hobby-plan ceiling (see builder-brief.md Section 17,
"Execution model"). Hitting it with no `brand` param still syncs both
in sequence, for a manual curl, but that form will time out on Hobby.

The same endpoint also runs the nightly YouTube subscriber refresh
(`refreshYouTubeSnapshotsAllBrands`, `src/lib/youtube-sync.ts`) on the
first brand's invocation. For each brand whose YouTube platform goal has
a `source_ref` and no `platform_snapshots` row yet today, it pulls and
stores the current count. Idempotent and non-fatal, so it never
disrupts the backup it rides alongside.
