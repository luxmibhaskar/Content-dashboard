import { CollapsibleSection } from "@/components/collapsible-section";
import { BackupStatus } from "@/components/backup-status";
import { LiveStatusSection } from "@/components/live-status-section";
import { SERVICES } from "@/lib/services";
import type { BrandBackupStatus } from "@/lib/backup-status";

// Follow-up item 5: "Check Alternatives" (the per-service check button
// and its stored verdict, backed by service_alternative_checks and the
// checkAlternatives action) is removed from the UI entirely, not just
// hidden, per explicit instruction. "Swap alternatives" stays, that's
// static reference info from SERVICES, a different feature. Live Status
// and Backup have also moved out of this section into their own
// collapsible container directly below it, rather than living inside
// System & Services.
export async function ServicesPanel({ backupStatuses }: { backupStatuses: BrandBackupStatus[] }) {
  return (
    <div className="space-y-4">
      {/* neutral on both: infrastructure/system status, nothing to do
          with any pillar. */}
      <CollapsibleSection title="System & Services" defaultOpen={false} neutral>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="py-1.5 pr-3 font-medium">Service</th>
                <th className="py-1.5 pr-3 font-medium">Powers</th>
                <th className="py-1.5 pr-3 font-medium">Tier</th>
                <th className="py-1.5 pr-3 font-medium">Est. cost</th>
                <th className="py-1.5 font-medium">Swap alternatives</th>
              </tr>
            </thead>
            <tbody>
              {SERVICES.map((s) => (
                <tr key={s.id} className="border-b border-border align-top last:border-0">
                  <td className="py-1.5 pr-3 font-medium whitespace-nowrap">{s.service}</td>
                  <td className="py-1.5 pr-3 text-muted-foreground">{s.powers}</td>
                  <td className="py-1.5 pr-3 text-muted-foreground whitespace-nowrap">{s.tier}</td>
                  <td className="py-1.5 pr-3 text-muted-foreground whitespace-nowrap">{s.estCost}</td>
                  <td className="py-1.5 text-muted-foreground">{s.swapAlternatives}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Live Status & Backup" defaultOpen={false} neutral>
        <LiveStatusSection />

        <div className="border-t border-border pt-3">
          <p className="text-xs font-medium text-muted-foreground">
            Backup (Google Sheets index + Drive full-content archive)
          </p>
          <div className="mt-2">
            <BackupStatus statuses={backupStatuses} />
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}
