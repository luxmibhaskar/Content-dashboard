import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";
import {
  CALENDAR_RANGE_COOKIE,
  CALENDAR_RANGE_FROM_COOKIE,
  CALENDAR_RANGE_TO_COOKIE,
  DEFAULT_CALENDAR_RANGE,
  computeRange,
  isCalendarRange,
  type CalendarRange,
} from "@/lib/date-range";
import { CalendarList } from "@/components/calendar-list";
import { SegmentedToggle } from "@/components/segmented-toggle";
import { FilterMenu } from "@/components/filter-menu";
import { Button } from "@/components/ui/button";
import { AddFromYoutubeForm } from "@/components/add-from-youtube-form";
import { createBlankContentItem } from "./actions";
import type { ContentCalendarItem } from "@/lib/types";

const SELECT_COLUMNS =
  "id, brand, final_title, production_status, pillar, sub_topic, format, publish_date, is_archived";

// docs/platform-performance-tracking.md Section 1: "one table, filtered
// view", not a separate Short Form table. All is the default: no format
// filter at all, so unlike the Long Form / Short Form views it also
// surfaces items with no format yet, or a legacy value from before
// Format narrowed to Short/Long Video (Reel/Post/Thread/Story/Other) -
// those still don't match either specific filter and stay invisible
// there until given a real format on their own topic page, same as
// before.
type ContentType = "all" | "long" | "short";
const CONTENT_TYPE_FORMAT: Record<Exclude<ContentType, "all">, "Long Video" | "Short"> = {
  long: "Long Video",
  short: "Short",
};

const RANGE_LABEL: Record<CalendarRange, string> = {
  week: "Week",
  month: "Month",
  "3month": "3 Month",
  "6month": "6 Month",
  year: "Year",
  custom: "Custom",
};

const SECTION_LABEL: Record<CalendarRange, string> = {
  week: "This week",
  month: "This month",
  "3month": "Last 3 months",
  "6month": "Last 6 months",
  year: "Last year",
  custom: "Selected range",
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string; type?: string }>;
}) {
  const params = await searchParams;

  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  // The URL's own ?range= always wins (a bookmarked or shared link with
  // an explicit range shouldn't be overridden by whatever was last
  // persisted); the cookie only fills in when the URL has none at all,
  // i.e. a plain /calendar link from the top nav, a quick-access card, or
  // "Back to Calendar" on a topic page. See date-range.ts and
  // /api/calendar-range for the rest of the persistence story.
  const rangeCookie = cookieStore.get(CALENDAR_RANGE_COOKIE)?.value;
  const rawRange = params.range ?? rangeCookie;
  const range: CalendarRange = isCalendarRange(rawRange) ? rawRange : DEFAULT_CALENDAR_RANGE;

  const customFrom =
    params.from ?? (range === "custom" ? cookieStore.get(CALENDAR_RANGE_FROM_COOKIE)?.value : undefined);
  const customTo =
    params.to ?? (range === "custom" ? cookieStore.get(CALENDAR_RANGE_TO_COOKIE)?.value : undefined);
  const { from, to } = computeRange(range, customFrom, customTo);
  const contentType: ContentType =
    params.type === "short" ? "short" : params.type === "long" ? "long" : "all";
  const contentFormat = contentType === "all" ? undefined : CONTENT_TYPE_FORMAT[contentType];

  const supabase = await createClient();
  const boundCreate = createBlankContentItem.bind(null, contentFormat);

  // Both the format toggle and the range menu link back here with the
  // other axis preserved. For a custom range, from/to ride along too, so
  // switching Long <-> Short no longer silently drops a picked range
  // (the old hardcoded `?type=X&range=Y` hrefs did). Range-changing links
  // (the Range dropdown, Clear filter) pass persist: true to route
  // through /api/calendar-range instead of straight to /calendar, so the
  // new choice gets written to the cookie; the format toggle doesn't
  // change the range, so it never needs to.
  function buildHref(next: { type?: ContentType; range?: CalendarRange }, opts?: { persist?: boolean }) {
    const nextType = next.type ?? contentType;
    const nextRange = next.range ?? range;
    const search = new URLSearchParams({ type: nextType, range: nextRange });
    if (nextRange === "custom") {
      if (customFrom) search.set("from", customFrom);
      if (customTo) search.set("to", customTo);
    }
    const base = opts?.persist ? "/api/calendar-range" : "/calendar";
    return `${base}?${search.toString()}`;
  }

  // Items with no production_status yet (still being scoped in the Idea
  // Panel/Scout flow, before Transfer to Calendar assigns a first real
  // status) intentionally don't render as cards here at all.
  let unscheduledQuery = supabase.from("content_calendar").select(SELECT_COLUMNS).eq("brand", brand);
  let scheduledQuery = supabase.from("content_calendar").select(SELECT_COLUMNS).eq("brand", brand);
  // All: no format filter at all, so it also picks up the formatless/
  // legacy-format items Long Form and Short Form each still can't see.
  if (contentFormat) {
    unscheduledQuery = unscheduledQuery.eq("format", contentFormat);
    scheduledQuery = scheduledQuery.eq("format", contentFormat);
  }
  const [{ data: unscheduled }, { data: scheduled }] = await Promise.all([
    unscheduledQuery
      .is("publish_date", null)
      .not("production_status", "is", null)
      .order("created_at", { ascending: false }),
    scheduledQuery
      .gte("publish_date", from)
      .lte("publish_date", `${to}T23:59:59`)
      .not("production_status", "is", null)
      .order("publish_date", { ascending: false }),
  ]);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Content Calendar</h1>
        <div className="flex flex-wrap items-start gap-3">
          {/* docs/topic-page-redesign.md Section 1: one button, no
              pre-form. Creates a blank item and redirects straight to its
              topic page, Title/Brief Description/Keywords now live there
              instead. */}
          <form action={boundCreate}>
            <Button type="submit" size="sm">
              + New
            </Button>
          </form>
          {/* docs/platform-performance-tracking.md Section 9.1: backfill
              an already-published Short straight from its YouTube URL,
              the reverse of "+ New" (that starts blank; this starts from
              a real video and pulls its title/description/publish time/
              counts). Always shown regardless of the Long/Short toggle
              above, same as "+ New" ignoring it, since format here comes
              from the pasted URL's own shape, not the current view. */}
          <AddFromYoutubeForm />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <SegmentedToggle
          ariaLabel="Content format"
          value={contentType}
          options={[
            { value: "all", label: "All", href: buildHref({ type: "all" }) },
            { value: "long", label: "Long Form", href: buildHref({ type: "long" }) },
            { value: "short", label: "Short Form", href: buildHref({ type: "short" }) },
          ]}
        />
        <div className="flex items-center gap-2">
          <FilterMenu
            label="Range"
            triggerLabel={RANGE_LABEL[range]}
            active={range !== DEFAULT_CALENDAR_RANGE}
            options={[
              { value: "week", label: "Week", href: buildHref({ range: "week" }, { persist: true }), active: range === "week" },
              { value: "month", label: "Month", href: buildHref({ range: "month" }, { persist: true }), active: range === "month" },
              { value: "3month", label: "3 Month", href: buildHref({ range: "3month" }, { persist: true }), active: range === "3month" },
              { value: "6month", label: "6 Month", href: buildHref({ range: "6month" }, { persist: true }), active: range === "6month" },
              { value: "year", label: "Year", href: buildHref({ range: "year" }, { persist: true }), active: range === "year" },
              { value: "custom", label: "Custom", href: buildHref({ range: "custom" }, { persist: true }), active: range === "custom" },
            ]}
          />
          {/* Persisted range filter: visible only once it's actually
              overriding the default, so it doesn't clutter the bar on
              every ordinary visit. Resetting to the default range and
              clearing it are the same action here - DEFAULT_CALENDAR_RANGE
              persisted is indistinguishable from nothing persisted at all. */}
          {range !== DEFAULT_CALENDAR_RANGE && (
            <a
              href={buildHref({ range: DEFAULT_CALENDAR_RANGE }, { persist: true })}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              Clear filter
            </a>
          )}
        </div>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {from} to {to}
      </p>

      {range === "custom" && <CustomRangeForm from={customFrom} to={customTo} type={contentType} />}

      {(unscheduled?.length ?? 0) > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-medium text-muted-foreground">Unscheduled</h2>
          <CalendarList items={(unscheduled ?? []) as ContentCalendarItem[]} />
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-sm font-medium text-muted-foreground">
          {SECTION_LABEL[range]}
        </h2>
        {(scheduled?.length ?? 0) === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Nothing scheduled in this range yet. Add your first topic with + New.
          </p>
        ) : (
          <CalendarList items={(scheduled ?? []) as ContentCalendarItem[]} />
        )}
      </section>
    </div>
  );
}

function CustomRangeForm({ from, to, type }: { from?: string; to?: string; type: ContentType }) {
  return (
    <form method="get" action="/api/calendar-range" className="mt-3 flex items-end gap-2">
      <input type="hidden" name="range" value="custom" />
      <input type="hidden" name="type" value={type} />
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground" htmlFor="from">
          From
        </label>
        <input
          id="from"
          name="from"
          type="date"
          defaultValue={from}
          className="h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground" htmlFor="to">
          To
        </label>
        <input
          id="to"
          name="to"
          type="date"
          defaultValue={to}
          className="h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
        />
      </div>
      <Button type="submit" size="sm" variant="outline">
        Apply
      </Button>
    </form>
  );
}
