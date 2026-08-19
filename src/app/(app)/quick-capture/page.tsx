import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";
import { pillarsFor } from "@/lib/pillars";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  QUICK_CAPTURE_CONTENT_TYPES,
  QUICK_CAPTURE_STATUSES,
  type QuickCapture,
} from "@/lib/types";
import {
  addQuickCapture,
  updateQuickCapture,
  deleteQuickCapture,
  migrateToIdea,
  migrateToReferenceVideo,
  migrateToCompetitorBenchmark,
} from "./actions";

export default async function QuickCapturePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const status = QUICK_CAPTURE_STATUSES.includes(statusParam as (typeof QUICK_CAPTURE_STATUSES)[number])
    ? statusParam!
    : "Inbox";

  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  const supabase = await createClient();

  const [{ data: captures }, { data: contentItems }] = await Promise.all([
    supabase
      .from("quick_capture")
      .select(
        "id, brand, url, pillar, quick_hook_notes, quick_rehook_notes, quick_cta_notes, content_type, competitor_name, status",
      )
      .eq("brand", brand)
      .eq("status", status)
      .order("created_at", { ascending: false }),
    supabase
      .from("content_calendar")
      .select("id, final_title")
      .eq("brand", brand)
      .order("created_at", { ascending: false }),
  ]);

  const rows = (captures ?? []) as QuickCapture[];
  const items = contentItems ?? [];

  return (
    <div className="w-full px-4 py-10">
      <h1 className="text-3xl font-bold">Quick Capture</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Always-available inbox for spontaneous finds, including competitor content. Paste a
        link now, sort it out during Weekly Review or topic planning.
      </p>

      <form action={addQuickCapture} className="mt-6 space-y-2 rounded-lg border border-border p-4">
        <Input name="url" type="url" required placeholder="Paste a TikTok/IG/YouTube link..." />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Input name="pillar" list="pillar-options" placeholder="Pillar (loose tag)" />
          <datalist id="pillar-options">
            {pillarsFor(brand).map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          <select name="content_type" defaultValue="" className="h-8 rounded-md border border-input bg-background px-2 text-sm">
            <option value="">Type...</option>
            {QUICK_CAPTURE_CONTENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <Input name="competitor_name" placeholder="Competitor name (if applicable)" className="sm:col-span-2" />
        </div>
        <Button type="submit" size="sm">
          + Capture
        </Button>
      </form>

      <div className="mt-6 flex items-center gap-2">
        {QUICK_CAPTURE_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/quick-capture?status=${s}`}
            className={cn(
              "rounded-md px-2.5 py-1 text-sm",
              status === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {s}
          </Link>
        ))}
      </div>

      <ul className="mt-4 space-y-3">
        {rows.map((c) => (
          <li key={c.id} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <a href={c.url} target="_blank" rel="noopener noreferrer" className="truncate text-sm font-medium hover:underline">
                {c.url}
              </a>
              <form action={deleteQuickCapture.bind(null, c.id)}>
                <Button type="submit" size="xs" variant="outline">
                  Delete
                </Button>
              </form>
            </div>

            <form action={updateQuickCapture.bind(null, c.id)} className="mt-3 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Input name="pillar" defaultValue={c.pillar ?? ""} placeholder="Pillar" className="h-7 text-xs" />
                <select
                  name="content_type"
                  defaultValue={c.content_type ?? ""}
                  className="h-7 rounded-md border border-input bg-background px-1.5 text-xs"
                >
                  <option value="">Type...</option>
                  {QUICK_CAPTURE_CONTENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <Input
                  name="competitor_name"
                  defaultValue={c.competitor_name ?? ""}
                  placeholder="Competitor name"
                  className="h-7 text-xs sm:col-span-2"
                />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Input name="quick_hook_notes" defaultValue={c.quick_hook_notes ?? ""} placeholder="Hook notes" className="h-7 text-xs" />
                <Input name="quick_rehook_notes" defaultValue={c.quick_rehook_notes ?? ""} placeholder="Re-hook notes" className="h-7 text-xs" />
                <Input name="quick_cta_notes" defaultValue={c.quick_cta_notes ?? ""} placeholder="CTA notes" className="h-7 text-xs" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <select
                  name="status"
                  defaultValue={c.status}
                  className="h-7 rounded-md border border-input bg-background px-1.5 text-xs"
                >
                  {QUICK_CAPTURE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <Button type="submit" size="xs" variant="outline">
                  Save
                </Button>
              </div>
            </form>

            {c.status !== "Migrated" && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                <form action={migrateToIdea.bind(null, c.id)}>
                  <Button type="submit" size="xs" variant="outline">
                    Migrate to Idea
                  </Button>
                </form>
                {items.length > 0 && (
                  <form className="flex items-center gap-1.5">
                    <select
                      name="content_id"
                      className="h-6 rounded-md border border-input bg-background px-1.5 text-xs"
                    >
                      {items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.final_title || "Untitled"}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" size="xs" variant="outline" formAction={migrateToReferenceVideo.bind(null, c.id)}>
                      &rarr; Reference Videos
                    </Button>
                    <Button type="submit" size="xs" variant="outline" formAction={migrateToCompetitorBenchmark.bind(null, c.id)}>
                      &rarr; Competitor Benchmark
                    </Button>
                  </form>
                )}
              </div>
            )}
          </li>
        ))}
        {rows.length === 0 && (
          <li className="rounded-lg border border-border px-3 py-6 text-center text-sm text-muted-foreground">
            Nothing in {status}.
          </li>
        )}
      </ul>
    </div>
  );
}
