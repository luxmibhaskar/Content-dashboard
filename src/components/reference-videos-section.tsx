import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/glow-card";
import type { ReferenceVideo } from "@/lib/types";
import {
  addReferenceVideo,
  updateReferenceVideoNotes,
  deleteReferenceVideo,
} from "@/app/(app)/calendar/[id]/reference-video-actions";

// Section 10.2.1: TikTok/Instagram links found during manual research, no
// reliable API exists for either platform. Cards stack newest first, no
// limit on how many per topic.
export function ReferenceVideosSection({
  contentId,
  videos,
}: {
  contentId: string;
  videos: ReferenceVideo[];
}) {
  return (
    <div className="mt-8">
      <h2 className="text-sm font-medium text-muted-foreground">Reference Videos</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Paste a TikTok or Instagram link, then log what grabbed attention, what kept you
        watching, and what they did at the end.
      </p>

      <form action={addReferenceVideo.bind(null, contentId)} className="mt-3 flex gap-2">
        <Input name="url" type="url" required placeholder="Paste a TikTok or Instagram link..." />
        <Button type="submit" size="sm">
          Add
        </Button>
      </form>

      <div className="mt-4 space-y-3">
        {videos.map((v, i) => (
          <GlowCard key={v.id} glow={((i % 3) + 1) as 1 | 2 | 3} className="p-3">
            <div className="flex items-center justify-between gap-2">
              <a
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-sm font-medium hover:underline"
              >
                {v.url}
              </a>
              <form action={deleteReferenceVideo.bind(null, contentId, v.id)}>
                <Button type="submit" size="xs" variant="outline">
                  Remove
                </Button>
              </form>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Added {new Date(v.date_added).toLocaleDateString()}
            </p>
            <form
              action={updateReferenceVideoNotes.bind(null, contentId, v.id)}
              className="mt-3 grid gap-2 sm:grid-cols-3"
            >
              <Input
                name="hook_note"
                defaultValue={v.hook_note ?? ""}
                placeholder="Hook (first few seconds)"
              />
              <Input
                name="rehook_note"
                defaultValue={v.rehook_note ?? ""}
                placeholder="Re-hook (mid-video)"
              />
              <Input name="cta_note" defaultValue={v.cta_note ?? ""} placeholder="CTA (ending)" />
              <Button type="submit" size="sm" variant="outline" className="sm:col-span-3">
                Save notes
              </Button>
            </form>
          </GlowCard>
        ))}
        {videos.length === 0 && (
          <p className="text-sm text-muted-foreground">No reference videos yet.</p>
        )}
      </div>
    </div>
  );
}
