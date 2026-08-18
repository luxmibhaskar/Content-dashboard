"use client";

import { useState } from "react";
import { getLiveServiceStatuses } from "@/app/actions/services-live";
import { SERVICES } from "@/lib/services";
import { cn } from "@/lib/utils";
import type { LiveStatus } from "@/lib/services-live";

const LIVE_SERVICES = SERVICES.filter((s) => s.hasLiveStatus);

// Section 5.3: "pull that number in on expand", not on every Today
// load, only these three services expose a usage number that's
// actually reachable with the credentials already configured.
export function LiveStatusSection() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, LiveStatus> | null>(null);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !results && !loading) {
      setLoading(true);
      try {
        setResults(await getLiveServiceStatuses());
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className="border-t border-border pt-3">
      <button
        type="button"
        onClick={toggle}
        className="flex items-center text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <span className={cn("mr-1.5 inline-block transition-transform", open && "rotate-90")}>&rsaquo;</span>
        Live Status
      </button>

      {open && (
        <div className="mt-2 space-y-1 text-xs">
          {loading && <p className="text-muted-foreground">Checking...</p>}
          {results &&
            LIVE_SERVICES.map((s) => {
              const status = results[s.id];
              const isError = status && "error" in status;
              return (
                <p key={s.id}>
                  <span className="font-medium">{s.service}: </span>
                  <span className={isError ? "text-amber-600" : "text-muted-foreground"}>
                    {isError ? status.error : status?.text}
                  </span>
                </p>
              );
            })}
        </div>
      )}
    </div>
  );
}
