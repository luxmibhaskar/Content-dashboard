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

// GlowCard's --glow-1/2/3 tokens (globals.css) are these exact same
// pillar colors under a different name, brand-scoped: for
// lbstransformation, glow-1/2/3 = Clay Terracotta/Deep Teal/Iron
// Charcoal = Body/Soul/Mind; for lbsworks, glow-1/2/3 = Build
// Indigo/Sell Amber/Scale Green = Build/Sell/Scale. Pillar order here
// intentionally does NOT match PILLAR_STRUCTURE's key order above
// (Body, Mind, Soul), it matches the glow-N assignment already fixed in
// globals.css, so this is the one place that mapping needs to be spelled
// out. Content that's genuinely tied to a real pillar (a Content
// Calendar item, a Quick Capture row) should color its GlowCard from
// this, not from an arbitrary list-position cycle, a Mind-pillar item
// showing Terracotta because of where it happens to sit in a list is
// exactly the "implies a categorization that isn't real" problem this
// exists to prevent. Returns null for no pillar or an unrecognized one
// (e.g. Quick Capture's free-text "loose tag"), callers should render
// GlowCard's neutral variant in that case rather than guessing a color.
const PILLAR_GLOW_INDEX: Record<Brand, Record<string, 1 | 2 | 3>> = {
  lbstransformation: { Body: 1, Soul: 2, Mind: 3 },
  lbsworks: { Build: 1, Sell: 2, Scale: 3 },
};

export function pillarGlowIndex(brand: Brand, pillar: string | null): 1 | 2 | 3 | null {
  if (!pillar) return null;
  return PILLAR_GLOW_INDEX[brand][pillar] ?? null;
}

// Merges user-added custom sub-topics (custom_sub_topics table, see
// src/lib/custom-sub-topics.ts) into the fixed base structure. Pillars
// themselves never gain entries this way, only sub-topics under a
// pillar that already exists, a custom row referencing an unknown
// pillar (shouldn't happen, addCustomSubTopic validates against
// pillarsFor before insert) is defensively dropped rather than creating
// a stray pillar. Duplicate names are deduped, not appended twice.
export function mergeCustomSubTopics(
  base: PillarStructure,
  custom: { pillar: string; sub_topic: string }[],
): PillarStructure {
  const merged: PillarStructure = {};
  for (const [pillar, subs] of Object.entries(base)) {
    merged[pillar] = [...subs];
  }
  for (const { pillar, sub_topic } of custom) {
    if (!merged[pillar]) continue;
    if (!merged[pillar].includes(sub_topic)) {
      merged[pillar] = [...merged[pillar], sub_topic];
    }
  }
  return merged;
}
