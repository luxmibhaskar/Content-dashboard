import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, BRAND_LABELS, DEFAULT_BRAND, isBrand } from "@/lib/brand";
import { computeStreak, todayDateKey, type StreakRow } from "@/lib/streaks";
import { localDateKey } from "@/lib/date";
import { StreakStrip } from "@/components/streak-strip";
import { ServicesPanel } from "@/components/services-panel";
import { getBackupStatuses } from "@/lib/backup-status";

export default async function TodayPage() {
  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - 60);

  const { data: streakRows } = await supabase
    .from("daily_streaks")
    .select("streak_date, walked, posted")
    .eq("brand", brand)
    .gte("streak_date", localDateKey(since))
    .order("streak_date", { ascending: false });

  const rows: StreakRow[] = streakRows ?? [];
  const walkStreak = computeStreak(rows, "walked");
  const postStreak = computeStreak(rows, "posted");
  const todayRow = rows.find((r) => r.streak_date === todayDateKey());

  const backupStatuses = await getBackupStatuses();
  const failingBackups = backupStatuses.filter((s) => s.isFailing);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Section 5.0: small, quiet strip above the (future) next-up hero,
          not itself the focal point of this screen. */}
      <StreakStrip
        walkStreak={walkStreak}
        postStreak={postStreak}
        todayLogged={Boolean(todayRow)}
        todayWalked={todayRow?.walked ?? false}
        todayPosted={todayRow?.posted ?? false}
      />

      {failingBackups.length > 0 && (
        <p className="mt-3 text-sm text-destructive">
          {failingBackups.map((s) => s.label).join(" and ")}{" "}
          {failingBackups.length === 1 ? "backup hasn't" : "backups haven't"} synced
          successfully in the last 2 attempts.{" "}
          {failingBackups[0].lastSyncedAt
            ? `Last known good sync: ${new Date(failingBackups[0].lastSyncedAt).toLocaleDateString()}.`
            : "No successful sync on record yet."}
        </p>
      )}

      <h1 className="mt-6 text-2xl font-semibold">Today &middot; {BRAND_LABELS[brand]}</h1>
      <p className="mt-2 text-muted-foreground">
        The next-up suggestion (the real hero of this screen) is coming once
        Journey Log and the Content Calendar have enough to suggest from.
      </p>

      {/* Section 5.3: collapsed by default, infrastructure stays out of
          sight until deliberately sought, at the very bottom of Today. */}
      <div className="mt-12">
        <ServicesPanel backupStatuses={backupStatuses} />
      </div>
    </div>
  );
}
