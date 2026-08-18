import { CollapsibleSection } from "@/components/collapsible-section";
import { BackupStatus } from "@/components/backup-status";
import { LiveStatusSection } from "@/components/live-status-section";
import { Button } from "@/components/ui/button";
import { checkAlternatives } from "@/app/actions/services-live";
import { SERVICES } from "@/lib/services";
import { createClient } from "@/lib/supabase/server";
import type { BrandBackupStatus } from "@/lib/backup-status";

type AlternativesCheck = { checked_date: string; findings_summary: string | null; verdict: string | null };

export async function ServicesPanel({ backupStatuses }: { backupStatuses: BrandBackupStatus[] }) {
  const supabase = await createClient();
  const { data: checks } = await supabase
    .from("service_alternative_checks")
    .select("service_name, checked_date, findings_summary, verdict")
    .order("checked_date", { ascending: false });

  const latestByService = new Map<string, AlternativesCheck>();
  for (const c of checks ?? []) {
    if (!latestByService.has(c.service_name)) latestByService.set(c.service_name, c);
  }

  return (
    <CollapsibleSection title="System & Services" defaultOpen={false}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="py-1.5 pr-3 font-medium">Service</th>
              <th className="py-1.5 pr-3 font-medium">Powers</th>
              <th className="py-1.5 pr-3 font-medium">Tier</th>
              <th className="py-1.5 pr-3 font-medium">Est. cost</th>
              <th className="py-1.5 pr-3 font-medium">Swap alternatives</th>
              <th className="py-1.5 font-medium">Check Alternatives</th>
            </tr>
          </thead>
          <tbody>
            {SERVICES.map((s) => {
              const check = latestByService.get(s.service);
              const boundCheck = checkAlternatives.bind(null, s.service, s.tier);
              return (
                <tr key={s.id} className="border-b border-border align-top last:border-0">
                  <td className="py-1.5 pr-3 font-medium whitespace-nowrap">{s.service}</td>
                  <td className="py-1.5 pr-3 text-muted-foreground">{s.powers}</td>
                  <td className="py-1.5 pr-3 text-muted-foreground whitespace-nowrap">{s.tier}</td>
                  <td className="py-1.5 pr-3 text-muted-foreground whitespace-nowrap">{s.estCost}</td>
                  <td className="py-1.5 pr-3 text-muted-foreground">{s.swapAlternatives}</td>
                  <td className="py-1.5">
                    <form action={boundCheck}>
                      <Button type="submit" size="xs" variant="outline">
                        Check
                      </Button>
                    </form>
                    {check && (
                      <div className="mt-1.5 max-w-xs text-xs text-muted-foreground">
                        <p className="font-medium text-foreground">{check.verdict}</p>
                        <p className="mt-0.5">{check.findings_summary}</p>
                        <p className="mt-0.5">
                          Last checked: {new Date(check.checked_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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
  );
}
