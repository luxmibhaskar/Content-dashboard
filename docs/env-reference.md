# Environment Variables Reference

What each of the 7 credentials in `.env.local` actually does. Keep this in
`docs/` alongside `builder-brief.md` for later reference, none of the real
values belong in this file, just the explanations.

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

**GOOGLE_SHEETS_BACKUP_ID**
Tells the app exactly which Google Sheet to write backup data into,
pulled directly from that Sheet's own URL. Without this, the app would
have the right permissions but no idea which specific sheet to use.
