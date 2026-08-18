import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";
import type { JourneyEntry } from "@/lib/types";

// Section 9.1: "the simplest implementation" the spec asks for, a
// filtered view of journey_log rows where angle_worthy = true, no
// separate table. angle_worthy itself is toggled on the entry's own
// page (My Journey Log), this view is read-only browsing.
export default async function AngleBankPage() {
  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  const supabase = await createClient();

  const { data: entries } = await supabase
    .from("journey_log")
    .select("id, brand, entry_date, pillar_focus, sub_topic, key_lesson_insight, proof_results, tags_keywords, angle_worthy")
    .eq("brand", brand)
    .eq("angle_worthy", true)
    .order("entry_date", { ascending: false });

  const rows = (entries ?? []) as JourneyEntry[];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Personal Angle Bank</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your best lived-experience angles, pulled from My Journey Log entries marked
        angle-worthy. Toggle that flag on any entry to add or remove it here.
      </p>

      <ul className="mt-6 space-y-3">
        {rows.map((entry) => (
          <li key={entry.id} className="rounded-lg border border-border p-3">
            <Link href={`/journey/${entry.id}`} className="block hover:bg-muted/50 -m-3 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{entry.entry_date}</span>
                {[...entry.pillar_focus, ...entry.sub_topic].length > 0 && (
                  <span className="truncate">{[...entry.pillar_focus, ...entry.sub_topic].join(" / ")}</span>
                )}
              </div>
              <p className="mt-1 text-sm font-medium">
                {entry.key_lesson_insight || "No lesson recorded yet"}
              </p>
              {entry.proof_results && (
                <p className="mt-1 text-sm text-muted-foreground">{entry.proof_results}</p>
              )}
              {entry.tags_keywords && (
                <p className="mt-1.5 text-xs text-muted-foreground">{entry.tags_keywords}</p>
              )}
            </Link>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="rounded-lg border border-border px-3 py-6 text-center text-sm text-muted-foreground">
            No angle-worthy entries yet. Mark one from My Journey Log to see it here.
          </li>
        )}
      </ul>
    </div>
  );
}
