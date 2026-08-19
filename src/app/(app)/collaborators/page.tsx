import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { COLLABORATOR_STATUSES, PLATFORMS } from "@/lib/types";
import { createCollaborator } from "./actions";

type CollaboratorListRow = {
  id: string;
  name: string;
  platform: string | null;
  status: string;
};

export default async function CollaboratorsPage() {
  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  const supabase = await createClient();
  const { data: collaborators } = await supabase
    .from("collaborators")
    .select("id, name, platform, status")
    .eq("brand", brand)
    .order("created_at", { ascending: false });

  const rows = (collaborators ?? []) as CollaboratorListRow[];
  const grouped: Record<(typeof COLLABORATOR_STATUSES)[number], CollaboratorListRow[]> = {
    Identified: rows.filter((c) => c.status === "Identified"),
    "Reached Out": rows.filter((c) => c.status === "Reached Out"),
    "In Talks": rows.filter((c) => c.status === "In Talks"),
    Collaborated: rows.filter((c) => c.status === "Collaborated"),
    "Not a Fit": rows.filter((c) => c.status === "Not a Fit"),
  };

  return (
    <div className="w-full px-4 py-10">
      <h1 className="text-3xl font-bold">Collaboration &amp; Outreach</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Borrowed-audience growth through collaboration, mirrors Competitors but for
        partnerships instead of benchmarking.
      </p>

      <form
        action={createCollaborator}
        className="mt-6 space-y-3 rounded-lg border border-border p-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required placeholder="Who are they" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="platform">Platform</Label>
            <Input
              id="platform"
              name="platform"
              list="platform-options"
              placeholder="YouTube, TikTok, multiple..."
            />
            <datalist id="platform-options">
              {PLATFORMS.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="profile_url">Profile URL</Label>
          <Input id="profile_url" name="profile_url" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={2}
            placeholder="Why they're a fit, audience overlap, what a collab could look like..."
          />
        </div>
        <Button type="submit" size="sm">
          + Add Collaborator
        </Button>
      </form>

      {COLLABORATOR_STATUSES.map((status) => (
        <section key={status} className="mt-8">
          <h2 className="text-sm font-medium text-muted-foreground">
            {status} ({grouped[status].length})
          </h2>
          {grouped[status].length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Nothing here yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
              {grouped[status].map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/collaborators/${c.id}`}
                    className="flex items-center justify-between gap-4 px-3 py-2.5 hover:bg-muted/50"
                  >
                    <span className="truncate text-sm font-medium">{c.name}</span>
                    {c.platform && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {c.platform}
                      </span>
                    )}
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
