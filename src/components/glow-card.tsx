"use client";

import { createContext, useContext, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
  type MotionValue,
} from "framer-motion";
import { cn } from "@/lib/utils";

export type GlowIndex = 1 | 2 | 3;

// Real bug, root-caused here rather than patched per call site: the
// outer motion.div below is a two-child box (the decorative sheen, then
// one content wrapper), so a caller's className landing on it only ever
// reaches those two children, never the actual content (form fields,
// list rows, a card's own flex layout) one level further in. Utilities
// that need to see the real children directly (space-y-*, divide-y,
// flex/grid + gap) silently did nothing, e.g. a "space-y-5" meant to
// gap a form's fields from its submit button instead put one unused
// margin on the sole wrapper div, leaving the button touching the field
// above it, the recurring gap reported on Topic Map/Collaborators/
// Weekly Review/Idea Panel forms, and the same class of bug also
// affecting `divide-y` list separators and `flex ...gap-*` row layouts
// elsewhere.
//
// So the incoming className is split between the outer .glow-card box
// and the inner content wrapper. Two kinds of utility belong on the
// OUTER box:
//   1. Margins (mt-, mx-, etc.) - they position the card against
//      whatever precedes it; .glow-card's own border blocks
//      margin-collapsing, so an inner margin shows up as space *inside*
//      the card instead of before it.
//   2. How the card sits in its parent layout as a flex/grid item, and
//      its outer box height: h-*, min-h-*, max-h-*, flex-1/auto/none,
//      grow, shrink, basis-*, self-*, order-*, col-/row-span. A caller
//      passing `h-full` or `flex-1` wants the *card* to fill/flex; if
//      that lands on the inner wrapper instead, the outer box stays
//      auto-height and `fill`'s inner `h-full` collapses against it
//      (the clipped Content Output donut, the zero-height dashboard
//      graph panel).
// Everything else - padding, gap, space-y, divide, flex direction,
// items/justify, text - lays out the card's own children and stays
// inner. Bare `flex`/`grid` are content layout, so they stay inner too;
// only the flex-*item* forms (flex-1, flex-[..]) move out.
const OUTER_TOKEN =
  /^(?:[\w-]+:)*-?(?:m[trblxyse]?-|h-|min-h-|max-h-|flex-(?:1|auto|none|initial|\[)|grow(?:-|$)|shrink(?:-|$)|basis-|self-|justify-self-|place-self-|order-|col-(?:span|start|end)-|row-(?:span|start|end)-)/;

function splitOuterAndInnerClasses(className?: string) {
  if (!className) return { outer: undefined, inner: undefined };
  const outer: string[] = [];
  const inner: string[] = [];
  for (const token of className.split(/\s+/).filter(Boolean)) {
    (OUTER_TOKEN.test(token) ? outer : inner).push(token);
  }
  return { outer: outer.join(" "), inner: inner.join(" ") };
}

// Five-refinement pass (on top of breathing/cursor-glow/tilt below):
// exposes the same raw mouseX/mouseY this card already tracks to its own
// descendants, so a card's icon/heading can shift a few extra px against
// the cursor during tilt (GlowCardParallax below) without threading
// motion values through props at every call site. null outside a
// GlowCard entirely (GlowCardParallax degrades to static in that case).
const GlowCardTiltContext = createContext<{ mouseX: MotionValue<number>; mouseY: MotionValue<number> } | null>(
  null,
);

// Refinement 5 (multi-plane parallax): wraps one "nearer" element (a
// card's icon or heading, never the whole card) so it shifts slightly
// more than the body content sitting still beneath it, that contrast is
// what reads as layered depth rather than the whole card rotating as one
// flat piece. Opt-in per element, not automatic on every GlowCard child,
// wired up so far on the two clearest icon/heading glanceable cards (KPI
// tiles, Quick Access cards); other call sites can adopt it the same way.
export function GlowCardParallax({
  children,
  className,
  depth = 6,
}: {
  children: React.ReactNode;
  className?: string;
  depth?: number;
}) {
  const tilt = useContext(GlowCardTiltContext);
  const fallback = useMotionValue(0.5);
  const x = useTransform(tilt?.mouseX ?? fallback, [0, 1], [-depth, depth]);
  const y = useTransform(tilt?.mouseY ?? fallback, [0, 1], [-depth, depth]);
  return (
    <motion.div style={{ x, y }} className={className}>
      {children}
    </motion.div>
  );
}

// Redesign Phase 4 (docs/dashboard-redesign.md): the one shared
// container primitive every card/box in the app routes through. The
// static glass look, brand-colored edge, and idle breathing animation
// are plain CSS (.glow-card in globals.css, cheaper and simpler than
// animating them from React, and where prefers-reduced-motion is
// actually handled, see that file); this component only owns the things
// that genuinely need pointer tracking: the cursor-following ambient
// glow, a second tighter specular highlight, the matching parallax tilt,
// and a click/tap ripple. Deliberately doesn't read useReducedMotion()
// itself: that hook's client-only first value can differ from its SSR
// value, and branching render output on it caused a real hydration
// mismatch here, this only ever moves the motion values in the pointer
// handlers below (never during render), and a reduced-motion user simply
// never triggers that movement client-side, same end result without the
// server/client split. glow picks which of the brand's three
// docs/brand-tokens.md colors this instance glows, so neighboring cards
// don't all carry the identical accent.
export function GlowCard({
  children,
  className,
  glow = 1,
  neutral = false,
  fill = false,
  textHeavy = false,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: GlowIndex;
  // glow-1/2/3 are literally the brand's three pillar colors under a
  // different name (see PILLAR_GLOW_INDEX in lib/pillars.ts), so using
  // them - cycled or fixed - implies a specific pillar categorization.
  // Correct for content genuinely tied to one (a Content Calendar item,
  // a Quick Capture row with a real pillar tag), wrong for generic
  // app-level chrome with no pillar of its own (KPI tiles, Quick Access,
  // sidebar widgets, graph panels, platform goals): coloring those by
  // pillar implies a categorization that isn't real. neutral overrides
  // glow entirely, using the brand's single --primary accent instead
  // (Iron Charcoal for LBsTransformation, Build Indigo for LBsWorks,
  // both already equal one of the glow-N values, just not consistently
  // the same index across brands, which is why this can't just be "pick
  // glow=3 everywhere" the way the two-line diff would look), and swaps
  // the background to a flat Mist-grey tint in light mode rather than
  // the default translucent card glass (dark mode's card tone was
  // already pillar-neutral, nothing to swap there). One consistent
  // color every time a card like this renders, never cycled.
  neutral?: boolean;
  // The inner content wrapper is a plain block div by default, sized to
  // its own content, so a child relying on h-full (e.g. a fixed-height
  // sidebar card with its own internal flex-col + a flex-1
  // overflow-y-auto scroll region, see JourneyLogWidget) gets nothing
  // to actually fill, height:100% resolves against an auto-height
  // parent as auto. fill switches that wrapper to flex h-full flex-col
  // so the card's own resolved height (from flex-1 in a fixed-height
  // flex column, or a grid cell, etc.) actually propagates down.
  fill?: boolean;
  // Same card-type scoping the visual-treatment pass already drew
  // (docs/dashboard-redesign.md Phase 4: "every genuine standalone
  // card/panel", including the topic page's text-heavy work surfaces):
  // full effect on glanceable cards (KPI tiles, list rows, Quick
  // Access), restrained here on dense text panels (Research & Copy,
  // Scripts, Competitor Benchmarks) where a second moving
  // highlight competes with reading rather than reading as polish. Skips
  // the tighter specular highlight entirely and dials back the rim
  // light/inner layer's opacity, the embossed inset shadows, the grain,
  // and the light-mode outward halo's strength (all CSS custom
  // properties, globals.css); breathing, the ambient glow, and tilt are
  // unaffected, those were already judged fine on text-heavy surfaces
  // when Phase 4 shipped.
  textHeavy?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(mouseY, [0, 1], [5, -5]), { stiffness: 220, damping: 22 });
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-5, 5]), { stiffness: 220, damping: 22 });
  const sheenBackground = useTransform([mouseX, mouseY], (latest) => {
    const [x, y] = latest as [number, number];
    return `radial-gradient(220px circle at ${x * 100}% ${y * 100}%, color-mix(in oklch, var(--glow-color) 40%, transparent), transparent 70%)`;
  });

  // Refinement 3: a second highlight distinct from the ambient glow
  // above, smaller and sharper (tighter falloff, brighter core) with its
  // own snappy, slightly-overshooting spring instead of the ambient's
  // unsprung 1:1 follow, that overshoot is what reads as "faster/livelier"
  // even though raw pointer position can't be tracked with less latency
  // than the ambient glow already has. Skipped entirely on textHeavy
  // cards (see the prop doc above).
  const specularX = useSpring(mouseX, { stiffness: 900, damping: 30, mass: 0.3 });
  const specularY = useSpring(mouseY, { stiffness: 900, damping: 30, mass: 0.3 });
  const specularBackground = useTransform([specularX, specularY], (latest) => {
    const [x, y] = latest as [number, number];
    return `radial-gradient(90px circle at ${x * 100}% ${y * 100}%, color-mix(in oklch, var(--glow-color) 75%, transparent), transparent 55%)`;
  });

  function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reducedMotion()) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  }

  function handlePointerLeave() {
    mouseX.set(0.5);
    mouseY.set(0.5);
  }

  // Touch has no mouse-leave equivalent: a tap fires one pointermove at
  // the touch point (tilting the card) with no guaranteed follow-up
  // event over the card to reset it, so without this a tapped card can
  // stay visibly tilted after the finger lifts. pointerup/pointercancel
  // both fire reliably on touch (cancel covers e.g. the browser taking
  // the gesture over for scrolling mid-touch). Scoped to touch only:
  // resetting on every pointerup would also fire for a mouse click,
  // snapping a hovered card flat mid-hover for no reason.
  function handlePointerEnd(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "touch") handlePointerLeave();
  }

  // Refinement 4: a real expanding ring from the actual tap/click point,
  // feedback on the click itself rather than only ever reacting to hover
  // proximity. rippleSeq is a plain ref counter, not state, IDs just need
  // to be unique within one card's lifetime for React's key + the removal
  // filter below, no reason to trigger a render to produce one.
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const rippleSeq = useRef(0);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (reducedMotion()) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const id = ++rippleSeq.current;
    setRipples((prev) => [...prev, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
  }

  function removeRipple(id: number) {
    setRipples((prev) => prev.filter((r) => r.id !== id));
  }

  const { outer: outerClassName, inner: innerClassName } = splitOuterAndInnerClasses(className);

  return (
    <motion.div
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onPointerDown={handlePointerDown}
      style={{
        rotateX,
        rotateY,
        perspective: 800,
        ["--glow-color" as string]: neutral ? "var(--primary)" : `var(--glow-${glow})`,
      }}
      data-text-heavy={textHeavy ? "true" : undefined}
      data-neutral={neutral ? "true" : undefined}
      className={cn("glow-card group rounded-lg", outerClassName)}
    >
      {/* Refinement 6 (embossed depth + grain): the directional inset
          "lit from one side" shadows and the outward halo (refinement 7's
          light-mode edge cue) live entirely in globals.css, both are part
          of the already-animated card-breathe box-shadow, no separate
          layer needed. Grain is the one static piece that does need its
          own layer, a background-image can't share a box-shadow list. */}
      <div aria-hidden="true" className="glow-card-grain" />
      <motion.div aria-hidden="true" className="glow-card-sheen" style={{ background: sheenBackground }} />
      {!textHeavy && (
        <motion.div
          aria-hidden="true"
          className="glow-card-specular"
          style={{ background: specularBackground }}
        />
      )}
      <GlowCardTiltContext.Provider value={{ mouseX, mouseY }}>
        <div className={cn("relative z-10", fill && "flex h-full flex-col", innerClassName)}>{children}</div>
      </GlowCardTiltContext.Provider>
      <AnimatePresence>
        {ripples.map((r) => (
          <motion.span
            key={r.id}
            aria-hidden="true"
            className="glow-card-ripple"
            style={{ left: r.x, top: r.y }}
            initial={{ opacity: 0.5, scale: 0 }}
            animate={{ opacity: 0, scale: textHeavy ? 6 : 9 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            onAnimationComplete={() => removeRipple(r.id)}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
