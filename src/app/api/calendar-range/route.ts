import { NextResponse } from "next/server";
import {
  CALENDAR_RANGE_COOKIE,
  CALENDAR_RANGE_FROM_COOKIE,
  CALENDAR_RANGE_TO_COOKIE,
  DEFAULT_CALENDAR_RANGE,
  isCalendarRange,
} from "@/lib/date-range";

const ONE_YEAR = 60 * 60 * 24 * 365;

// Content Calendar's Range dropdown and Custom date form both link/POST
// here instead of straight to /calendar, purely so the choice can be
// written to a cookie before landing there - a Server Component
// (calendar/page.tsx) can't set cookies itself, only a Server Action or,
// as here, a Route Handler can. See date-range.ts's own comment for why
// this needs to exist at all. A plain redirect either way, so this reads
// as an ordinary link/GET-form submission, no client JS involved.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawRange = searchParams.get("range");
  const range = isCalendarRange(rawRange) ? rawRange : DEFAULT_CALENDAR_RANGE;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const type = searchParams.get("type");

  const dest = new URL("/calendar", request.url);
  dest.searchParams.set("range", range);
  if (type) dest.searchParams.set("type", type);
  if (range === "custom" && from && to) {
    dest.searchParams.set("from", from);
    dest.searchParams.set("to", to);
  }

  const response = NextResponse.redirect(dest);
  response.cookies.set(CALENDAR_RANGE_COOKIE, range, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
  });
  if (range === "custom" && from && to) {
    response.cookies.set(CALENDAR_RANGE_FROM_COOKIE, from, { path: "/", maxAge: ONE_YEAR, sameSite: "lax" });
    response.cookies.set(CALENDAR_RANGE_TO_COOKIE, to, { path: "/", maxAge: ONE_YEAR, sameSite: "lax" });
  } else {
    response.cookies.delete(CALENDAR_RANGE_FROM_COOKIE);
    response.cookies.delete(CALENDAR_RANGE_TO_COOKIE);
  }

  return response;
}
