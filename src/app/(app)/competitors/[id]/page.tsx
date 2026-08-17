import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PLATFORMS, type Competitor } from "@/lib/types";
import { updateCompetitor, deleteCompetitor } from "./actions";

export default async function CompetitorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: competitor } = await supabase
    .from("competitors")
    .select("id, brand, name, platform, profile_url, notes, active")
    .eq("id", id)
    .single<Competitor>();

  if (!competitor) {
    notFound();
  }

  const { data: benchmarks } = await supabase
    .from("competitor_benchmarks")
    .select("id, content_id, why_benchmark, content_calendar:content_id(id, final_title)")
    .eq("competitor_id", id);

  const boundUpdate = updateCompetitor.bind(null, competitor.id);
  const boundDelete = deleteCompetitor.bind(null, competitor.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/competitors" className="text-sm text-muted-foreground hover:underline">
        &larr; Competitors
      </Link>

      <form action={boundUpdate} className="mt-4 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" defaultValue={competitor.name} required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="platform">Platform</Label>
            <Input
              id="platform"
              name="platform"
              list="platform-options"
              defaultValue={competitor.platform ?? ""}
            />
            <datalist id="platform-options">
              {PLATFORMS.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile_url">Profile URL</Label>
            <Input id="profile_url" name="profile_url" defaultValue={competitor.profile_url ?? ""} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" defaultValue={competitor.notes ?? ""} rows={3} />
        </div>

        <label className="flex items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={competitor.active}
            className="size-3.5"
          />
          Active
        </label>

        <div className="flex items-center justify-between pt-2">
          <Button type="submit">Save</Button>
        </div>
      </form>

      <div className="mt-8 border-t border-border pt-6">
        <p className="text-sm font-medium">Used in {benchmarks?.length ?? 0} topics</p>
        {(benchmarks?.length ?? 0) > 0 && (
          <ul className="mt-2 space-y-1.5">
            {benchmarks!.map((b) => (
              <li key={b.id} className="text-sm">
                <Link href={`/calendar/${b.content_id}`} className="hover:underline">
                  {(b.content_calendar as unknown as { final_title: string | null })
                    ?.final_title || "Untitled"}
                </Link>
                {b.why_benchmark && (
                  <span className="text-muted-foreground">: {b.why_benchmark}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <form action={boundDelete} className="mt-6">
        <Button type="submit" variant="destructive" size="sm">
          Delete competitor
        </Button>
      </form>
    </div>
  );
}
