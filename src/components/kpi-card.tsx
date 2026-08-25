import { GlowCard, GlowCardParallax } from "@/components/glow-card";

// Refinement 5 (multi-plane parallax, on top of GlowCard's other four):
// the value is this card's one glanceable "heading", wrapped so it shifts
// a couple extra px against the cursor during tilt while the label stays
// put, that stillness-vs-shift contrast is what sells depth. neutral, not
// a cycled glow index: these tiles are generic stat panels ("Total
// Views", "Current Streak"), not tied to any one pillar, so coloring
// them with the app's pillar palette (even cycled for variety) implied a
// categorization that isn't real. See GlowCard's neutral prop doc.
export function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <GlowCard neutral className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <GlowCardParallax className="mt-1 text-2xl font-semibold">{value}</GlowCardParallax>
    </GlowCard>
  );
}
