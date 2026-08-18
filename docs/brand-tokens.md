# Brand Design Tokens

Reference for both brands' visual identity. Read this in full before Phase A
of the design system implementation (see the handoff prompt). Exact values
here are the source of truth, don't approximate or round any hex code or
pixel value.

## LBsTransformation

**Tagline:** Body – Mind – Soul
**Pillars:** BODY → MIND → SOUL
**Personality:** Grounded, masculine but warm, no-BS, practical, compassionate,
calm confidence not gym-bro aggression, "older brother / coach" energy.
**Visual vibe:** Earthy, human, minimal, strong structure with softer edges,
warmth and breathing space.

### Colors
- Iron Charcoal `#1F2937` — primary brand, MIND pillar
- Clay Terracotta `#C26D4C` — BODY pillar (effort, transformation)
- Deep Teal `#0F766E` — SOUL pillar (calm, depth)
- Ink `#0B1021` — deepest dark
- Slate `#475569` — mid text, borders
- Mist `#F1F5F9` — light background
- White `#FFFFFF`

Usage: primary buttons and main headings use Iron Charcoal. Pillar tags:
BODY = Terracotta, MIND = Charcoal, SOUL = Teal. "Done"/calm states = Deep
Teal. Effort/workout/transformation states = Clay Terracotta. Text is
Ink/Iron Charcoal on light backgrounds, White on dark.

### Typography
Font: **Manrope** (weights 400, 500, 600, 700)
- H1: 32px / line-height 1.2 / weight 700
- H2: 24px / 1.25 / 600
- H3: 20px / 1.3 / 600
- Body: 16px / 1.6 / 400
- Small: 14px / 1.5 / 400
- Caption: 12px / 1.4 / 400

Headings SemiBold/Bold, body Regular. Avoid all-caps except short pillar
labels (BODY/MIND/SOUL).

### Layout & Spacing
Base unit 8px. Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64px. Max width
1100px, side padding 24px mobile / 32-40px desktop. Card radius 12px, inner
padding 20px. Shadows: softer and warmer, slightly larger blur, lower
contrast than a typical sharp UI shadow.

### Components
- Primary button: Iron Charcoal background, White text, 10px radius
- Secondary button: transparent, Slate border, Charcoal text
- Pillar button: pillar color background, White text
- Card: White background, very light border, 20px padding, thin
  pillar-color stripe across the top
- Tag: pill-shaped, pillar color at 10-15% opacity background, pillar
  color text
- Input: Slate border, focus state = Iron Charcoal, 10px radius

### Icons
Lucide, outline style, 1.5-2px stroke. Default color Slate, pillar-specific
icons use their pillar color.

### Motion
UI hover: 200-250ms. Card enter: 300-350ms. Video transitions: 400-500ms.
Easing: ease-out / ease-in-out. Buttons: subtle color shift, minimal scale.

### Voice (for AI-generated content, not UI copy)
Grounded, clear, supportive, no-BS, compassionate. Educational content
stays calm and structured ("here's the simple version"). Transformation
content is honest and vulnerable, process over perfection. Mind/Soul
content is reflective and gentle, inviting rather than preachy.

---

## LBsWorks

**Tagline:** Learn – Build – Share, in public
**Pillars:** BUILD → SELL → SCALE
**Personality:** Builder-first, practical, experimental, tech-adjacent but
human, clear and structured, no-fluff, "lab" energy (testing, iterating,
sharing results).
**Visual vibe:** Clean, modern, slightly technical, strong hierarchy,
colors used intentionally.

### Colors
- Build Indigo `#4F46E5` — primary brand, BUILD pillar
- Sell Amber `#F59E0B` — SELL pillar (money, offers, launches)
- Scale Green `#10B981` — SCALE pillar (growth, systems, ROI)
- Ink `#0B1021` — deepest dark
- Build Charcoal `#1F2937` — headings, secondary dark
- Slate `#475569` — mid text, borders
- Mist `#F1F5F9` — light background
- White `#FFFFFF`

Usage: primary buttons, main CTAs, and key links use Build Indigo. Pillar
tags use their pillar color only. Success/"Published" states = Scale
Green. Warnings/"Hot"/"New" states = Sell Amber. Text is Ink/Build
Charcoal on light, White on dark.

### Typography
Font: **Inter** (weights 400, 500, 600, 700)
- H1: 32px / 1.2 / 700
- H2: 24px / 1.25 / 600
- H3: 20px / 1.3 / 600
- Body: 16px / 1.6 / 400
- Small: 14px / 1.5 / 400
- Caption: 12px / 1.4 / 400

Headings SemiBold/Bold, body Regular. No other fonts.

### Layout & Spacing
Base unit 8px. Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64px. Max width
1200px, side padding 24px mobile / 32-48px desktop. Card radius 10px,
inner padding 16-20px. Shadows: subtle and techy, light offset, low
opacity.

### Components
- Primary button: Build Indigo background, White text, 8px radius
- Secondary button: transparent, Slate border, Charcoal text
- Pillar button: pillar color background, White text
- Card: White background, light border, 16-20px padding, thin
  pillar-color stripe across the top
- Tag: pill-shaped, pillar color at 10-15% opacity background, pillar
  color text
- Input: Slate border, focus state = Build Indigo, 8px radius

### Icons
Lucide, outline style, 1.5-2px stroke. Default color Slate, pillar-specific
icons use their pillar color.

### Motion
UI hover: 150-200ms. Card enter: 250-300ms. Video transitions: 300-400ms.
Easing: ease-out / ease-in-out. Buttons: subtle scale plus color shift.

### Voice (for AI-generated content, not UI copy)
Direct, practical, experimental, honest, builder-first. Educational
content is calm and step-by-step. Launch content is confident and direct,
minimal hype. Personal content is vulnerable, "figured out loud."

---

## Shared neutrals (both brands, identical)
Ink `#0B1021`, Slate `#475569`, Mist `#F1F5F9`, White `#FFFFFF`. Only the
primary/pillar colors and the second dark neutral (Iron Charcoal vs Build
Charcoal, which happen to share the same hex `#1F2937` but mean different
things per brand) differ between the two.
