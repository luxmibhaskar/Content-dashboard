"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { syncBackupNow } from "@/app/actions/backup";
import { cn } from "@/lib/utils";
import type { BrandBackupStatus } from "@/lib/backup-status";

export function BackupStatus({ statuses }: { statuses: BrandBackupStatus[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-2 text-sm">
      {statuses.map((s) => (
        <p key={s.brand} className={cn(s.isFailing ? "text-destructive" : "text-muted-foreground")}>
          {s.label}:{" "}
          {s.lastSyncedAt ? `last synced ${new Date(s.lastSyncedAt).toLocaleString()}` : "never synced"}
          {s.isFailing &&
            ` (${s.failingLayers.join(" and ")} hasn't synced successfully in the last 2 attempts)`}
        </p>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => startTransition(() => syncBackupNow())}
      >
        {isPending ? "Syncing..." : "Sync now"}
      </Button>
    </div>
  );
}
