import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";
import { HOOK_LIBRARY_TYPES, type HookLibraryType } from "@/lib/types";

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function isHookLibraryType(value: string | null): value is HookLibraryType {
  return !!value && (HOOK_LIBRARY_TYPES as readonly string[]).includes(value);
}

// Real file download, not a client-side blob: a plain <a href> to this
// route with the right Content-Disposition header, no client JS needed.
// Reads the brand from the same cookie every other page uses, not a
// query param, so this stays consistent with the rest of the app's
// brand switching. One type per export by default, matching the
// one-type-per-import flow, plus an explicit "all" that exports all
// three types combined (with a type column/field so they stay
// distinguishable), for when you want the whole swipe file at once.
export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const format = searchParams.get("format") === "csv" ? "csv" : "json";
  const type = searchParams.get("type");
  const isAll = type === "all";

  if (!isAll && !isHookLibraryType(type)) {
    return new NextResponse("Missing or invalid type (visual/text/verbal/all).", { status: 400 });
  }

  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  const supabase = await createClient();
  const { data, error } = isAll
    ? await supabase
        .from("hook_library_entries")
        .select("type,content")
        .eq("brand", brand)
        .order("type", { ascending: true })
        .order("created_at", { ascending: true })
    : await supabase
        .from("hook_library_entries")
        .select("content")
        .eq("brand", brand)
        .eq("type", type as HookLibraryType)
        .order("created_at", { ascending: true });

  if (error) {
    return new NextResponse(error.message, { status: 500 });
  }

  const entries = (data ?? []) as { type?: HookLibraryType; content: string }[];
  const filenameSuffix = isAll ? "" : `-${type}`;

  if (format === "csv") {
    const rows = isAll
      ? [["type", "content"], ...entries.map((e) => [e.type ?? "", e.content])]
      : [["content"], ...entries.map((e) => [e.content])];
    const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="hook-library-${brand}${filenameSuffix}.csv"`,
      },
    });
  }

  const json = isAll ? entries : entries.map((e) => e.content);
  return new NextResponse(JSON.stringify(json, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="hook-library-${brand}${filenameSuffix}.json"`,
    },
  });
}
