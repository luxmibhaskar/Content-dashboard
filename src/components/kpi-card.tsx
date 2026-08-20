import { GlowCard } from "@/components/glow-card";

export function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <GlowCard glow={2} className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </GlowCard>
  );
}
