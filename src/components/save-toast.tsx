"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

// The idea and journey detail pages save via a Server Action that
// redirect()s back to the same URL, so nothing visibly changes to
// confirm the write landed. Those actions now append ?saved=<timestamp>;
// this reads that token, shows a brief "Saved" confirmation, then strips
// the param from the URL so a manual refresh doesn't replay it. A fresh
// timestamp on every save means back-to-back saves each re-trigger it.
export function SaveToast({ token }: { token: string | null }) {
  const [dismissed, setDismissed] = useState<string | null>(null);
  const visible = token != null && token !== dismissed;

  useEffect(() => {
    if (!visible) return;

    if (typeof window !== "undefined" && window.location.search.includes("saved=")) {
      const url = new URL(window.location.href);
      url.searchParams.delete("saved");
      window.history.replaceState(window.history.state, "", url.pathname + url.search);
    }

    const hide = setTimeout(() => setDismissed(token), 3500);
    return () => clearTimeout(hide);
  }, [visible, token]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm font-medium shadow-lg"
    >
      <Check className="size-4 text-emerald-500" aria-hidden="true" />
      Saved
    </div>
  );
}
