"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createContentItemFromYouTube } from "@/app/(app)/calendar/actions";

// docs/platform-performance-tracking.md Section 9.1: sits next to "+ New"
// on the Calendar list. A client component, not a plain
// <form action={...}> like "+ New", because this can fail (bad URL,
// video not found, YouTube API error) and needs to show that inline
// without navigating away, then otherwise navigate to the new item
// itself - the same direct-await-the-server-action-from-an-event-handler
// pattern used for the topic page's Notes tab (note-card.tsx,
// content-notes-section.tsx), here also carrying the router.push a
// success case needs.
export function AddFromYoutubeForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await createContentItemFromYouTube(new FormData(e.currentTarget));
    if (result.ok) {
      router.push(`/calendar/${result.id}`);
      return;
    }
    setError(result.error);
    setBusy(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Input
          name="url"
          type="url"
          required
          placeholder="Paste a published Short's YouTube URL..."
          className="w-64"
          disabled={busy}
        />
        <Button type="submit" size="sm" variant="outline" disabled={busy}>
          {busy ? "Adding…" : "+ From YouTube"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}
