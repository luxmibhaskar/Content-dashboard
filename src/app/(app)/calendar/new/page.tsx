import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { GlowCard } from "@/components/glow-card";
import { createContentItem } from "../actions";

// docs/topic-page-redesign.md Section 1: condensed to three fields only,
// centered in a comfortably proportioned layout, not full-width
// stretched boxes. This is context only, nothing else collects input
// here, everything else fills in from the topic page itself.
//
// Two entry points share this one form (Content Calendar's "+ New (AI
// Research)" and "+ New (Manual)" buttons), same three fields either
// way, `entry` just carries through to createContentItem so it can
// redirect to the topic page with the right thing front-and-center:
// Run for AI Research (unchanged), "Paste from AI chat" expanded for
// Manual. Read here, not guessed on the topic page from anything else,
// since there's nothing else to distinguish "just created, came from
// Manual" from "existing item with nothing pasted yet".
export default async function NewContentItemPage({
  searchParams,
}: {
  searchParams: Promise<{ entry?: string }>;
}) {
  const { entry } = await searchParams;
  const isManual = entry === "manual";

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-3xl font-bold">New Topic</h1>
          <p className="text-sm text-muted-foreground">
            {isManual
              ? "Just enough to get started, paste your own research in on the next page."
              : "Just enough to get started, everything else fills in from here."}
          </p>
        </div>

        <form action={createContentItem}>
        <input type="hidden" name="entry" value={entry ?? ""} />
        <GlowCard glow={1} className="space-y-4 rounded-xl p-6">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" placeholder="What's this about?" required autoFocus />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="brief_description">Brief Description</Label>
            <Textarea
              id="brief_description"
              name="brief_description"
              rows={3}
              placeholder="A sentence or two of context"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="keywords">Keywords</Label>
            <Input id="keywords" name="keywords" placeholder="comma or space separated" />
          </div>

          <Button type="submit" className="w-full">
            {isManual ? "Continue" : "Run"}
          </Button>
        </GlowCard>
        </form>

        <Link
          href="/calendar"
          className="block text-center text-sm text-muted-foreground hover:underline"
        >
          &larr; Back to Content Calendar
        </Link>
      </div>
    </div>
  );
}
