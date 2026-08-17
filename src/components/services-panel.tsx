import { CollapsibleSection } from "@/components/collapsible-section";
import { SERVICES } from "@/lib/services";

export function ServicesPanel() {
  return (
    <CollapsibleSection title="System & Services" defaultOpen={false}>
      <p className="text-xs text-muted-foreground">
        Static reference for now, live usage numbers and one-tap &quot;Check
        Alternatives&quot; research are a Phase 3 enhancement.
      </p>
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
              <tr key={s.service} className="border-b border-border last:border-0">
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
  );
}
