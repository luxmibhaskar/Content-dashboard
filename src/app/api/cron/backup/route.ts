import { NextResponse } from "next/server";
import { runBackupSyncBrands, runBackupSyncAllBrands } from "@/lib/backup";
import { refreshYouTubeSnapshotsAllBrands } from "@/lib/youtube-sync";
import { BRANDS, isBrand } from "@/lib/brand";

// One brand's sync (18 Sheets tabs + full Drive archive) is well past
// Vercel's default function limit and, on Hobby, close to the 60s hard
// ceiling on its own, which is why vercel.json schedules this once per
// brand (?brand=...) rather than doing both in one invocation. 60 is the
// Hobby ceiling; raise to 300 if this project moves to Pro.
export const maxDuration = 60;

// Hit nightly by Vercel Cron (see vercel.json) with ?brand=<brand>, once
// per brand on staggered schedules. Vercel sends this same bearer token
// automatically once CRON_SECRET is set in the project's env vars.
// A missing/invalid brand param falls back to all brands in sequence,
// for a manual curl; on Hobby that form will time out, it exists only so
// the endpoint still does the obvious thing when hit by hand.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const brandParam = new URL(request.url).searchParams.get("brand");
  const brand = isBrand(brandParam) ? brandParam : null;

  // GROUP J: keep each brand's YouTube subscriber count fresh once a day
  // without anyone pressing Refresh. Independent of the backup, its own
  // failures never block it, at most one Data API call per brand per day.
  // Runs on the first brand's nightly invocation (or the all-brands
  // fallback); it already no-ops for a brand that has today's snapshot,
  // so a second call the same night is cheap either way.
  let youtube:
    | Awaited<ReturnType<typeof refreshYouTubeSnapshotsAllBrands>>
    | { error: string }
    | { skipped: true } = { skipped: true };
  if (!brand || brand === BRANDS[0]) {
    try {
      youtube = await refreshYouTubeSnapshotsAllBrands();
    } catch (err) {
      youtube = { error: err instanceof Error ? err.message : String(err) };
    }
  }

  const results = brand
    ? await runBackupSyncBrands([brand])
    : await runBackupSyncAllBrands();
  return NextResponse.json({ results, youtube });
}
