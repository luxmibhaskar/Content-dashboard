import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { COLLABORATOR_STATUSES, PLATFORMS, type Collaborator } from "@/lib/types";
import { updateCollaborator, deleteCollaborator } from "./actions";

export default async function CollaboratorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: collaborator } = await supabase
    .from("collaborators")
    .select("id, brand, name, platform, profile_url, status, notes, last_contact_date")
    .eq("id", id)
    .single<Collaborator>();

  if (!collaborator) {
    notFound();
  }

  const boundUpdate = updateCollaborator.bind(null, collaborator.id);
  const boundDelete = deleteCollaborator.bind(null, collaborator.id);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-10">
      <Link href="/collaborators" className="text-sm text-muted-foreground hover:underline">
        &larr; Collaboration &amp; Outreach
      </Link>

      <form action={boundUpdate} className="mt-4 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" defaultValue={collaborator.name} required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            defaultValue={collaborator.status}
            className="h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
          >
            {COLLABORATOR_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="platform">Platform</Label>
            <Input
              id="platform"
              name="platform"
              list="platform-options"
              defaultValue={collaborator.platform ?? ""}
            />
            <datalist id="platform-options">
              {PLATFORMS.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile_url">Profile URL</Label>
            <Input
              id="profile_url"
              name="profile_url"
              defaultValue={collaborator.profile_url ?? ""}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="last_contact_date">Last contact date (optional)</Label>
          <Input
            id="last_contact_date"
            name="last_contact_date"
            type="date"
            defaultValue={collaborator.last_contact_date ?? ""}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            defaultValue={collaborator.notes ?? ""}
            rows={3}
            placeholder="Why they're a fit, audience overlap, what a collab could look like..."
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button type="submit">Save</Button>
        </div>
      </form>

      <form action={boundDelete} className="mt-6">
        <Button type="submit" variant="destructive" size="sm">
          Delete collaborator
        </Button>
      </form>
    </div>
  );
}
