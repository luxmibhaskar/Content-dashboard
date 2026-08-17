import { NextResponse } from "next/server";
import { runBackupSyncAllBrands } from "@/lib/backup";

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
