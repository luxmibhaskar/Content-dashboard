import { pillarColor } from "@/lib/pillars";

// docs/brand-tokens.md, Components -> Tag: "pill-shaped, pillar color at
// 10-15% opacity background, pillar color text." 22 in the hex alpha
// suffix is ~13% opacity, the middle of that range.
export function PillarTag({ pillar }: { pillar: string }) {
  const color = pillarColor(pillar);
  return (
    <span
      className="inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${color}22`, color }}
    >
      {/* A solid white pill hugging just the text, not the diffused
          glow this replaced, that wasn't strong enough for Mind's
          near-black. The outer pill above keeps its existing brand-color
          background/text exactly as before, this inner one is the only
          new piece. */}
      <span className="rounded-full bg-white px-1.5 py-px" style={{ color }}>
        {pillar}
      </span>
    </span>
  );
}
