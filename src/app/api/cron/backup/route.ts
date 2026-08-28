import { NextResponse } from "next/server";
import { runBackupSyncAllBrands } from "@/lib/backup";

// A full sync is 18 Sheets tabs plus the Drive archive across both
// brands, well past Vercel's default function limit (~10-15s). 60 is the
// Hobby-plan ceiling; raise to 300 if this project moves to Pro.
export const maxDuration = 60;

// Hit nightly by Vercel Cron (see vercel.json), which sends this same
// bearer token automatically once CRON_SECRET is set in the Vercel
// project's env vars, no manual wiring needed on that end.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const results = await runBackupSyncAllBrands();
  return NextResponse.json({ results });
}
