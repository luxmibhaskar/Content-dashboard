import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";
import { currentReviewWeek, addDays, localDateKey } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WeeklyReview } from "@/lib/types";
import { GlowCard } from "@/components/glow-card";
import { saveWeeklyReview } from "./actions";

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const defaultWeek = currentReviewWeek();
  const weekStart = week || defaultWeek.start;
  const weekEnd = week ? localDateKey(addDays(new Date(`${week}T00:00:00`), 6)) : defaultWeek.end;

  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  const supabase = await createClient();

  const [{ data: review }, { data: pastReviews }] = await Promise.all([
    supabase
      .from("weekly_reviews")
      .select(
        "id, brand, week_start_date, week_end_date, posted_as_planned, pillar_balance_notes, retention_drop_patterns, hook_library_insights, earned_click_updates, next_week_adjustment",
      )
      .eq("brand", brand)
      .eq("week_start_date", weekStart)
      .maybeSingle<WeeklyReview>(),
    supabase
      .from("weekly_reviews")
      .select("id, week_start_date, week_end_date, next_week_adjustment")
      .eq("brand", brand)
      .order("week_start_date", { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold">Weekly Review</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        15-20 minutes, Sundays. Missed weeks just resume next Sunday, never combine two
        weeks into one session.
      </p>

      <p className="mt-4 text-sm font-medium">
        Week of {weekStart} to {weekEnd}
      </p>

      <form action={saveWeeklyReview} className="mt-4">
        <input type="hidden" name="week_start_date" value={weekStart} />
        <input type="hidden" name="week_end_date" value={weekEnd} />
        <GlowCard glow={1} className="space-y-5 p-4">

        <div className="space-y-1.5">
          <Label htmlFor="posted_as_planned">
            1. Scan this week&apos;s calendar entries — did you post what you planned?
          </Label>
          <Textarea
            id="posted_as_planned"
            name="posted_as_planned"
            rows={2}
            defaultValue={review?.posted_as_planned ?? ""}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pillar_balance_notes">
            2. Check pillar balance — is one pillar dominating or neglected?
          </Label>
          <Textarea
            id="pillar_balance_notes"
            name="pillar_balance_notes"
            rows={2}
            defaultValue={review?.pillar_balance_notes ?? ""}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="retention_drop_patterns">
            3. Glance at retention drop notes — any repeat drop points?
          </Label>
          <Textarea
            id="retention_drop_patterns"
            name="retention_drop_patterns"
            rows={2}
            defaultValue={review?.retention_drop_patterns ?? ""}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="hook_library_insights">
            4. Scan{" "}
            <Link href="/hook-library" className="underline">
              Hook Library
            </Link>{" "}
            — any hook type showing as a repeat winner?
          </Label>
          <Textarea
            id="hook_library_insights"
            name="hook_library_insights"
            rows={2}
            defaultValue={review?.hook_library_insights ?? ""}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="earned_click_updates">
            5. Update &quot;Did I Earn the Click&quot; for last week&apos;s videos (on each
            item&apos;s{" "}
            <Link href="/calendar" className="underline">
              topic page
            </Link>
            ) — summarize here.
          </Label>
          <Textarea
            id="earned_click_updates"
            name="earned_click_updates"
            rows={2}
            defaultValue={review?.earned_click_updates ?? ""}
          />
        </div>

        <div className="space-y-1.5 rounded-md border border-dashed border-border p-3">
          <p className="text-sm">
            6. Update view/engagement numbers for non-YouTube platforms (TikTok, Instagram,
            Threads, Facebook) — YouTube pulls automatically, nothing else does. Do this
            directly on each item&apos;s{" "}
            <Link href="/calendar" className="underline">
              topic page
            </Link>
            , Publishing Ready section.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="next_week_adjustment">What to adjust next week (one line)</Label>
          <Input id="next_week_adjustment" name="next_week_adjustment" defaultValue={review?.next_week_adjustment ?? ""} />
        </div>

        <Button type="submit">Save this week&apos;s review</Button>
        </GlowCard>
      </form>

      {(pastReviews?.length ?? 0) > 0 && (
        <div className="mt-10 border-t border-border pt-6">
          <h2 className="text-sm font-medium text-muted-foreground">Past Reviews</h2>
          <ul className="mt-2 space-y-1.5">
            {pastReviews!
              .filter((r) => r.week_start_date !== weekStart)
              .map((r) => (
                <li key={r.id} className="text-sm">
                  <Link href={`/review?week=${r.week_start_date}`} className="hover:underline">
                    {r.week_start_date} to {r.week_end_date}
                  </Link>
                  {r.next_week_adjustment && (
                    <span className="text-muted-foreground"> - {r.next_week_adjustment}</span>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
