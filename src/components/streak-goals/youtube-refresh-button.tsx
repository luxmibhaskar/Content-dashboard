"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { refreshYouTubeSnapshot } from "@/app/actions/platforms";

// GROUP J: on-demand YouTube subscriber pull. The action writes the same
// platform_snapshots row a manual save would, so this and manual entry
// never conflict, last write today wins. On failure the message shows
// inline and the previous number stays put.
export function YouTubeRefreshButton() {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="xs"
        variant="outline"
        loading={isPending}
        onClick={() =>
          startTransition(async () => {
            const res = await refreshYouTubeSnapshot();
            setMsg(
              res.ok
                ? { kind: "ok", text: `Updated to ${res.count.toLocaleString()} subscribers` }
                : { kind: "error", text: res.error },
            );
          })
        }
      >
        Refresh from YouTube
      </Button>
      {msg && (
        <span className={msg.kind === "ok" ? "text-xs text-emerald-600" : "text-xs text-destructive"}>
          {msg.text}
        </span>
      )}
    </div>
  );
}
