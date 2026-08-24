import { GlowCard, GlowCardParallax } from "@/components/glow-card";

// Refinement 5 (multi-plane parallax, on top of GlowCard's other four):
// the value is this card's one glanceable "heading", wrapped so it shifts
// a couple extra px against the cursor during tilt while the label stays
// put, that stillness-vs-shift contrast is what sells depth.
export function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <GlowCard glow={2} className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <GlowCardParallax className="mt-1 text-2xl font-semibold">{value}</GlowCardParallax>
    </GlowCard>
  );
}
