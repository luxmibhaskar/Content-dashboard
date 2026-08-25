import { GlowCard, GlowCardParallax, type GlowIndex } from "@/components/glow-card";

// Refinement 5 (multi-plane parallax, on top of GlowCard's other four):
// the value is this card's one glanceable "heading", wrapped so it shifts
// a couple extra px against the cursor during tilt while the label stays
// put, that stillness-vs-shift contrast is what sells depth. glow has no
// default: every call site sits in a row of several KPI tiles, so each
// one passes a cycled index the same way calendar-list.tsx and the other
// GlowCard lists do, rather than every tile glowing the same accent.
export function KpiCard({ label, value, glow }: { label: string; value: string; glow: GlowIndex }) {
  return (
    <GlowCard glow={glow} className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <GlowCardParallax className="mt-1 text-2xl font-semibold">{value}</GlowCardParallax>
    </GlowCard>
  );
}
