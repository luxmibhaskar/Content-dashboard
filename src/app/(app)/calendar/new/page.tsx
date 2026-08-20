import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { GlowCard } from "@/components/glow-card";
import { CreateFromPasteForm } from "@/components/create-from-paste-form";
import { createContentItem } from "../actions";

// docs/topic-page-redesign.md Section 1. Two entry points, genuinely
// different flows now, not two label variants of the same form:
//
// "+ New (AI Research)" (entry unset): the original condensed
// three-field form, Title, Brief Description, Keywords, centered,
// comfortably proportioned, not full-width stretched. This is context
// only, nothing else collects input here, everything else fills in
// from the topic page itself. Unchanged.
//
// "+ New (Manual)" (entry=manual): no form at all, paste-first
// (CreateFromPasteForm). Replaces the earlier "collect three fields,
// then Continue, then land on the topic page with Paste expanded" flow
// rather than sitting alongside it, the item itself doesn't get created
// until the paste actually parses.
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
          <h1 className="text-3xl font-bold">New Topic{isManual ? " (Manual)" : ""}</h1>
          <p className="text-sm text-muted-foreground">
            {isManual
              ? "Paste your own research in, the item gets created once it's parsed."
              : "Just enough to get started, everything else fills in from here."}
          </p>
        </div>

        <GlowCard glow={1} className="space-y-4 rounded-xl p-6">
          {isManual ? (
            <CreateFromPasteForm />
          ) : (
            <form action={createContentItem} className="space-y-4">
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
                Run
              </Button>
            </form>
          )}
        </GlowCard>

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
