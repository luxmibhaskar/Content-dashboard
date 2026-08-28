"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { syncBackupNow } from "@/app/actions/backup";
import { cn } from "@/lib/utils";
import type { Brand } from "@/lib/brand";
import type { BrandBackupStatus } from "@/lib/backup-status";

export function BackupStatus({ statuses }: { statuses: BrandBackupStatus[] }) {
  const [isPending, startTransition] = useTransition();
  // One brand syncs at a time: each is its own function invocation with
  // its own time budget, and running both from one click would put them
  // back in a single request. Whichever button was pressed shows the
  // spinner; the others disable until it returns.
  const [syncingBrand, setSyncingBrand] = useState<Brand | null>(null);

  return (
    <div className="space-y-2 text-sm">
      {statuses.map((s) => (
        <div key={s.brand} className="flex items-center justify-between gap-3">
          <p className={cn(s.isFailing ? "text-destructive" : "text-muted-foreground")}>
            {s.label}:{" "}
            {s.lastSyncedAt
              ? `last synced ${new Date(s.lastSyncedAt).toLocaleString()}`
              : "never synced"}
            {s.isFailing &&
              ` (${s.failingLayers.join(" and ")} hasn't synced successfully in the last 2 attempts)`}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => {
              setSyncingBrand(s.brand);
              startTransition(async () => {
                try {
                  await syncBackupNow(s.brand);
                } finally {
                  setSyncingBrand(null);
                }
              });
            }}
          >
            {syncingBrand === s.brand ? "Syncing..." : "Sync now"}
          </Button>
        </div>
      ))}
    </div>
  );
}
