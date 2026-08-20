import { pillarColor } from "@/lib/pillars";

// docs/brand-tokens.md, Components -> Tag: "pill-shaped, pillar color at
// 10-15% opacity background, pillar color text." 22 in the hex alpha
// suffix is ~13% opacity, the middle of that range.
export function PillarTag({ pillar }: { pillar: string }) {
  const color = pillarColor(pillar);
  return (
    <span
      className="pillar-label-glow inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${color}22`, color }}
    >
      {pillar}
    </span>
  );
}
