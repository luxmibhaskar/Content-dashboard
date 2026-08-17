import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FORMATS, IDEA_SOURCES, IDEA_STATUSES } from "@/lib/types";
import { createIdea } from "./actions";

type IdeaListRow = {
  id: string;
  idea_title: string;
  pillar: string | null;
  sub_topic: string | null;
  status: string;
};

export default async function IdeasPage() {
  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  const supabase = await createClient();
  const { data: ideas } = await supabase
    .from("ideas")
    .select("id, idea_title, pillar, sub_topic, status")
    .eq("brand", brand)
    .order("created_at", { ascending: false });

  const rows = (ideas ?? []) as IdeaListRow[];
  const grouped: Record<(typeof IDEA_STATUSES)[number], IdeaListRow[]> = {
    Idea: rows.filter((i) => i.status === "Idea"),
    Research: rows.filter((i) => i.status === "Research"),
    "Ready to work": rows.filter((i) => i.status === "Ready to work"),
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Idea Panel</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Fast capture, under a minute. Deep research and full detail live in the Content
        Calendar.
      </p>

      <form action={createIdea} className="mt-6 space-y-3 rounded-lg border border-border p-4">
        <div className="space-y-1.5">
          <Label htmlFor="idea_title">Idea title</Label>
          <Input id="idea_title" name="idea_title" required placeholder="What's the idea?" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="pillar">Pillar</Label>
            <Input id="pillar" name="pillar" placeholder="e.g. Body" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sub_topic">Sub-topic</Label>
            <Input id="sub_topic" name="sub_topic" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="format">Format</Label>
            <select
              id="format"
              name="format"
              defaultValue=""
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">-</option>
              {FORMATS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="idea_source">Source</Label>
            <select
              id="idea_source"
              name="idea_source"
              defaultValue=""
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">-</option>
              {IDEA_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="brief_description">Brief description (optional)</Label>
          <Textarea id="brief_description" name="brief_description" rows={2} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="reference_url">Reference URL (optional)</Label>
            <Input id="reference_url" name="reference_url" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="source_detail">Source detail (optional)</Label>
            <Input id="source_detail" name="source_detail" placeholder="the actual comment/DM text..." />
          </div>
        </div>
        <Button type="submit" size="sm">
          + Add Idea
        </Button>
      </form>

      {IDEA_STATUSES.map((status) => (
        <section key={status} className="mt-8">
          <h2 className="text-sm font-medium text-muted-foreground">
            {status} ({grouped[status].length})
          </h2>
          {grouped[status].length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Nothing here yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
              {grouped[status].map((idea) => (
                <li key={idea.id}>
                  <Link
                    href={`/ideas/${idea.id}`}
                    className="flex items-center justify-between gap-4 px-3 py-2.5 hover:bg-muted/50"
                  >
                    <span className="truncate text-sm font-medium">{idea.idea_title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {[idea.pillar, idea.sub_topic].filter(Boolean).join(" / ")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
