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

## Google (Sheets backup)

**GOOGLE_SERVICE_ACCOUNT_EMAIL**
The email address of the "robot" identity Google Cloud created. This is
the exact address the backup Google Sheet was shared with, which is what
gives the app permission to write to it, same as sharing a sheet with a
colleague, except this "colleague" is code.

**GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY**
The private credential that proves to Google's servers that a request
really is coming from that service account. Comes from the JSON file
downloaded during setup, always used together with the email above, one
doesn't work without the other.

**GOOGLE_SHEETS_BACKUP_ID_LBSTRANSFORMATION** /
**GOOGLE_SHEETS_BACKUP_ID_LBSWORKS**
Tell the app exactly which Google Sheet to write each brand's backup
into, one workbook per brand per builder-brief.md Section 17.1, each
pulled directly from that Sheet's own URL. Without these, the app
would have the right permissions but no idea which specific sheet to
use for which brand.

## YouTube (Research automation)

**YOUTUBE_API_KEY**
Powers the Research tab's video pull: search for the top 10 videos
matching a topic's title, their view counts, descriptions, and top
comments. Free within the standard daily quota. Doesn't grant access to
real transcripts, captions.download requires OAuth consent from the
video's own channel owner, not available for other people's videos with
just an API key, title/description/comments are the actual signal this
pulls, not a fallback for when a transcript happens to be missing.

## Backup automation

**CRON_SECRET**
A shared password that proves a request to `/api/cron/backup` really
came from Vercel's scheduled Cron job, not some random visitor hitting
the URL. Any string works, generated once and reused, set the same
value here and in the Vercel project's env vars after deploying.
