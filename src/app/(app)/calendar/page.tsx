import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";
import { computeRange, type CalendarRange } from "@/lib/date-range";
import { CalendarList } from "@/components/calendar-list";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ContentCalendarItem } from "@/lib/types";

const SELECT_COLUMNS =
  "id, brand, final_title, production_status, viability_status, viability_reason_note, pillar, sub_topic, format, publish_date, is_archived";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const range: CalendarRange =
    params.range === "week" || params.range === "custom" ? params.range : "month";
  const { from, to } = computeRange(range, params.from, params.to);

  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  const supabase = await createClient();

  // Items with no production_status yet (still being scoped in the Idea
  // Panel/Scout flow, before Transfer to Calendar assigns a first real
  // status) intentionally don't render as cards here at all.
  const [{ data: unscheduled }, { data: scheduled }] = await Promise.all([
    supabase
      .from("content_calendar")
      .select(SELECT_COLUMNS)
      .eq("brand", brand)
      .is("publish_date", null)
      .not("production_status", "is", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("content_calendar")
      .select(SELECT_COLUMNS)
      .eq("brand", brand)
      .gte("publish_date", from)
      .lte("publish_date", `${to}T23:59:59`)
      .not("production_status", "is", null)
      .order("publish_date", { ascending: true }),
  ]);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Content Calendar</h1>
        <Button asChild size="sm">
          <Link href="/calendar/new">+ New</Link>
        </Button>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <RangeLink range="week" active={range === "week"}>
          Week
        </RangeLink>
        <RangeLink range="month" active={range === "month"}>
          Month
        </RangeLink>
        <RangeLink range="custom" active={range === "custom"}>
          Custom
        </RangeLink>
        <span className="ml-2 text-xs text-muted-foreground">
          {from} to {to}
        </span>
      </div>

      {range === "custom" && <CustomRangeForm from={params.from} to={params.to} />}

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

function RangeLink({
  range,
  active,
  children,
}: {
  range: CalendarRange;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={`/calendar?range=${range}`}
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

function CustomRangeForm({ from, to }: { from?: string; to?: string }) {
  return (
    <form method="get" action="/calendar" className="mt-3 flex items-end gap-2">
      <input type="hidden" name="range" value="custom" />
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground" htmlFor="from">
          From
        </label>
        <input
          id="from"
          name="from"
          type="date"
          defaultValue={from}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
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
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
        />
      </div>
      <Button type="submit" size="sm" variant="outline">
        Apply
      </Button>
    </form>
  );
}
