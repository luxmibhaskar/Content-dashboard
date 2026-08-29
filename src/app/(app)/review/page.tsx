import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";
import { currentReviewWeek, reviewWeekOf } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WeeklyReview } from "@/lib/types";
import { GlowCard } from "@/components/glow-card";
import { WeekPicker } from "@/components/week-picker";
import { EntryReadView, ReadField } from "@/components/entry-read-view";
import { saveWeeklyReview } from "./actions";

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; edit?: string }>;
}) {
  const { week, edit } = await searchParams;
  const defaultWeek = currentReviewWeek();
  // Snap whatever ?week= holds to its Monday-Sunday week so weekStart is
  // always the exact key weekly_reviews is unique on.
  const viewedWeek = week ? reviewWeekOf(week) : defaultWeek;
  const weekStart = viewedWeek.start;
  const weekEnd = viewedWeek.end;
  const isCurrentWeek = weekStart === defaultWeek.start;
  const isPastWeek = weekStart < defaultWeek.start;

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

  // ?edit=1 shows the form. Without it, a saved week shows a read-only
  // summary with an Edit action; a week with nothing saved yet goes
  // straight to the form (nothing to read, and the point of opening it
  // is to fill it in).
  const isEditing = edit === "1";
  const showForm = isEditing || !review;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold">Weekly Review</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        15-20 minutes, Sundays. Missed weeks just resume next Sunday, never combine two
        weeks into one session.
      </p>

      <p className="mt-5 text-sm font-medium">
        Week of {weekStart} to {weekEnd}
      </p>
      {!isCurrentWeek && (
        <p className="mt-1 text-xs text-muted-foreground">
          {isPastWeek ? "Editing a past week" : "Getting a head start on an upcoming week"}
          {review ? " - it already has a saved review below." : " - nothing saved for it yet."}
        </p>
      )}

      <WeekPicker weekStart={weekStart} currentWeekStart={defaultWeek.start} />

      {!showForm && review && (
        <EntryReadView
          editHref={`/review?week=${weekStart}&edit=1`}
          header={<p className="text-sm font-medium">Saved answers</p>}
        >
          <ReadField
            label="1. Posted what you planned?"
            value={review.posted_as_planned}
          />
          <ReadField label="2. Pillar balance" value={review.pillar_balance_notes} />
          <ReadField
            label="3. Retention drop patterns"
            value={review.retention_drop_patterns}
          />
          <ReadField label="4. Hook Library insights" value={review.hook_library_insights} />
          <ReadField
            label="5. Did I Earn the Click updates"
            value={review.earned_click_updates}
          />
          {review.next_week_adjustment ? (
            <div className="space-y-1 border-t border-border pt-3">
              <p className="text-xs font-medium text-muted-foreground">
                What to adjust next week
              </p>
              <p className="text-sm">{review.next_week_adjustment}</p>
            </div>
          ) : null}
          {!review.posted_as_planned &&
            !review.pillar_balance_notes &&
            !review.retention_drop_patterns &&
            !review.hook_library_insights &&
            !review.earned_click_updates &&
            !review.next_week_adjustment && (
              <p className="text-sm text-muted-foreground">
                This review was saved with no answers filled in. Use Edit to add them.
              </p>
            )}
        </EntryReadView>
      )}

      {/* key on the week so switching weeks with the picker remounts the
          form: the fields are uncontrolled (defaultValue), which React
          otherwise won't refresh on a query-only navigation, leaving the
          previous week's answers sitting in a new week's blank form. */}
      {showForm && (
      <form key={weekStart} action={saveWeeklyReview} className="mt-6">
        <input type="hidden" name="week_start_date" value={weekStart} />
        <input type="hidden" name="week_end_date" value={weekEnd} />
        <GlowCard neutral className="space-y-6 p-5">

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
          {/* Label is flex items-center (ui/label.tsx), each direct
              child becomes its own flex item, at narrow widths that
              shrank the Link and the two text runs into separate
              wrapping columns instead of one normal reading-order
              paragraph. A single wrapping span keeps this as Label's
              one child, so it wraps as ordinary inline text. */}
          <Label htmlFor="hook_library_insights">
            <span>
              4. Scan{" "}
              <Link href="/hook-library" className="underline">
                Hook Library
              </Link>{" "}
              — any hook type showing as a repeat winner?
            </span>
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
            <span>
              5. Update &quot;Did I Earn the Click&quot; for last week&apos;s videos (on each
              item&apos;s{" "}
              <Link href="/calendar" className="underline">
                topic page
              </Link>
              ) — summarize here.
            </span>
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

        <div className="flex items-center gap-2">
          <Button type="submit">
            {isCurrentWeek
              ? "Save this week's review"
              : review
                ? "Save changes to this review"
                : "Save this review"}
          </Button>
          {review && (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/review?week=${weekStart}`}>Cancel</Link>
            </Button>
          )}
        </div>
        </GlowCard>
      </form>
      )}

      {(pastReviews?.length ?? 0) > 0 && (
        <div className="mt-10 border-t border-border pt-6">
          <h2 className="text-sm font-medium text-muted-foreground">Past Reviews</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Click any week to open it above as a summary, then Edit to change it.
          </p>
          <ul className="mt-2">
            {/* Every week is a link that loads that review into the panel
                above (upsert keyed on the week). The week currently open
                is kept in this list, not filtered out, and tagged so it
                is clear which row is showing. */}
            {pastReviews!.map((r) => {
              const tag =
                r.week_start_date === defaultWeek.start
                  ? "This week"
                  : r.week_start_date === weekStart
                    ? isEditing
                      ? "Editing"
                      : "Viewing"
                    : null;
              return (
                <li key={r.id}>
                  <Link
                    href={`/review?week=${r.week_start_date}`}
                    className="-mx-2 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/40"
                  >
                    <span className="font-medium">
                      {r.week_start_date} to {r.week_end_date}
                    </span>
                    {tag && (
                      <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {tag}
                      </span>
                    )}
                    {r.next_week_adjustment && (
                      <span className="truncate text-muted-foreground">- {r.next_week_adjustment}</span>
                    )}
                    <span aria-hidden className="ml-auto shrink-0 text-muted-foreground">
                      Open ›
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
