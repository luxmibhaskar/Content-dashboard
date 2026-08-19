import type { Brand } from "@/lib/brand";

// Fixed pillar/sub-topic vocabulary from builder-brief.md Sections 15.1
// (LBsTransformation) and 15.2 (LBsWorks, post-Month-One). The Pillar Tree
// visualization itself is Phase 3, but this underlying fixed list is
// static content worth using now for Journey Log's multi-selects, rather
// than free text that would need migrating later.
export type PillarStructure = Record<string, string[]>;

export const PILLAR_STRUCTURE: Record<Brand, PillarStructure> = {
  lbstransformation: {
    Body: [
      "Fitness & Weight Loss",
      "Physical Appearance & Physique",
      "Body Language & Posture",
      "Body Care & Skin Care",
      "Longevity",
    ],
    Mind: [
      "Confidence & Personality",
      "Language & Social Dynamics",
      "Positive Conditioning & Productivity",
      "Self-Image Building & Self-Respect",
      "Self-Moral Compass",
    ],
    Soul: [
      "Connecting to Oneself",
      "Self-Satisfaction",
      "Mental Stability & Peacefulness (Meditation)",
      "Awareness & Presence",
      "Purpose & Contribution",
    ],
  },
  lbsworks: {
    Build: [
      "Digital Products",
      "Apps & Tools",
      "AI Sites & AI Creators",
      "Services",
      "Stack & Tools",
      "Build Logs",
    ],
    Sell: ["Monetization Paths", "Offers & Positioning", "Pricing", "Business Models", "Launch & Promotion"],
    Scale: [
      "Audience & Content",
      "SEO & Traffic",
      "Distribution & Repurposing",
      "Email & Owned Audience",
      "Productivity & ROI",
      "Automation & Systems",
      "Experiments",
    ],
  },
};

export function pillarsFor(brand: Brand): string[] {
  return Object.keys(PILLAR_STRUCTURE[brand]);
}

export function subTopicsFor(brand: Brand): string[] {
  return Object.values(PILLAR_STRUCTURE[brand]).flat();
}

// Section 4.3: "one consistent color per pillar, used everywhere."
// Exact hex values from docs/brand-tokens.md (authoritative source),
// not approximated. BODY = Clay Terracotta, MIND = Iron Charcoal,
// SOUL = Deep Teal (LBsTransformation); BUILD = Build Indigo,
// SELL = Sell Amber, SCALE = Scale Green (LBsWorks).
export const PILLAR_COLORS: Record<string, string> = {
  Body: "#C26D4C",
  Mind: "#1F2937",
  Soul: "#0F766E",
  Build: "#4F46E5",
  Sell: "#F59E0B",
  Scale: "#10B981",
};

export function pillarColor(pillar: string): string {
  return PILLAR_COLORS[pillar] ?? "#6b7280";
}
