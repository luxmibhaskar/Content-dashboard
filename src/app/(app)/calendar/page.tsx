import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";
import { computeRange, type CalendarRange } from "@/lib/date-range";
import { CalendarList } from "@/components/calendar-list";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createBlankContentItem } from "./actions";
import type { ContentCalendarItem } from "@/lib/types";

const SELECT_COLUMNS =
  "id, brand, final_title, production_status, pillar, sub_topic, format, publish_date, is_archived";

// docs/platform-performance-tracking.md Section 1: "one table, filtered
// view", not a separate Short Form table. Long Form is the default,
// matching the order Format's own select already offers them in
// (format-platform-fields.tsx). Items with no format yet, or a legacy
// value from before Format narrowed to Short/Long Video (Reel/Post/
// Thread/Story/Other), don't match either filter and won't appear in
// this list until given a real one on their own topic page. Real
// impact confirmed low before shipping this: only 2 such items exist
// across brands right now, both pre-existing test data.
type ContentType = "long" | "short";
const CONTENT_TYPE_FORMAT: Record<ContentType, "Long Video" | "Short"> = {
  long: "Long Video",
  short: "Short",
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string; type?: string }>;
}) {
  const params = await searchParams;
  const range: CalendarRange =
    params.range === "week" || params.range === "custom" ? params.range : "month";
  const { from, to } = computeRange(range, params.from, params.to);
  const contentType: ContentType = params.type === "short" ? "short" : "long";
  const contentFormat = CONTENT_TYPE_FORMAT[contentType];

  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  const supabase = await createClient();
  const boundCreate = createBlankContentItem.bind(null, contentFormat);

  // Items with no production_status yet (still being scoped in the Idea
  // Panel/Scout flow, before Transfer to Calendar assigns a first real
  // status) intentionally don't render as cards here at all.
  const [{ data: unscheduled }, { data: scheduled }] = await Promise.all([
    supabase
      .from("content_calendar")
      .select(SELECT_COLUMNS)
      .eq("brand", brand)
      .eq("format", contentFormat)
      .is("publish_date", null)
      .not("production_status", "is", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("content_calendar")
      .select(SELECT_COLUMNS)
      .eq("brand", brand)
      .eq("format", contentFormat)
      .gte("publish_date", from)
      .lte("publish_date", `${to}T23:59:59`)
      .not("production_status", "is", null)
      .order("publish_date", { ascending: true }),
  ]);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Content Calendar</h1>
        {/* docs/topic-page-redesign.md Section 1: one button, no
            pre-form. Creates a blank item and redirects straight to its
            topic page, Title/Brief Description/Keywords now live there
            instead. */}
        <form action={boundCreate}>
          <Button type="submit" size="sm">
            + New
          </Button>
        </form>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <TypeLink type="long" active={contentType === "long"} range={range}>
          Long Form
        </TypeLink>
        <TypeLink type="short" active={contentType === "short"} range={range}>
          Short Form
        </TypeLink>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <RangeLink range="week" active={range === "week"} type={contentType}>
          Week
        </RangeLink>
        <RangeLink range="month" active={range === "month"} type={contentType}>
          Month
        </RangeLink>
        <RangeLink range="custom" active={range === "custom"} type={contentType}>
          Custom
        </RangeLink>
        <span className="ml-2 text-xs text-muted-foreground">
          {from} to {to}
        </span>
      </div>

      {range === "custom" && <CustomRangeForm from={params.from} to={params.to} type={contentType} />}

      {(unscheduled?.length ?? 0) > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-medium text-muted-foreground">Unscheduled</h2>
          <CalendarList items={(unscheduled ?? []) as ContentCalendarItem[]} />
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-sm font-medium text-muted-foreground">
          {range === "week" ? "This week" : range === "month" ? "This month" : "Selected range"}
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

function TypeLink({
  type,
  active,
  range,
  children,
}: {
  type: ContentType;
  active: boolean;
  range: CalendarRange;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={`/calendar?type=${type}&range=${range}`}
      className={cn(
        "rounded-md px-2.5 py-1 text-sm font-medium",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </Link>
  );
}

function RangeLink({
  range,
  active,
  type,
  children,
}: {
  range: CalendarRange;
  active: boolean;
  type: ContentType;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={`/calendar?type=${type}&range=${range}`}
      className={cn(
        "rounded-md px-2.5 py-1 text-sm",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </Link>
  );
}

function CustomRangeForm({ from, to, type }: { from?: string; to?: string; type: ContentType }) {
  return (
    <form method="get" action="/calendar" className="mt-3 flex items-end gap-2">
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
