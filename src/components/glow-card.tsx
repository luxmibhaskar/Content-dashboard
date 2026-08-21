"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

type GlowIndex = 1 | 2 | 3;

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
// elsewhere. Margin utilities (mt-, mx-, etc.) are the one exception:
// they position the card itself against whatever precedes it on the
// page, and only work from the outer box, since .glow-card's own border
// (globals.css) blocks margin-collapsing, an inner margin would show up
// as unwanted space inside the card instead of before it. So the
// incoming className is split: margin tokens stay on the outer box,
// everything else moves to the wrapper div that's the real content's
// direct parent, one fix here rather than 30+ call sites each patched
// by hand (and silently un-fixed the next time a page copies this
// pattern).
const MARGIN_TOKEN = /^(?:[\w-]+:)*-?m[trblxyse]?-/;

function splitOuterAndInnerClasses(className?: string) {
  if (!className) return { outer: undefined, inner: undefined };
  const outer: string[] = [];
  const inner: string[] = [];
  for (const token of className.split(/\s+/).filter(Boolean)) {
    (MARGIN_TOKEN.test(token) ? outer : inner).push(token);
  }
  return { outer: outer.join(" "), inner: inner.join(" ") };
}

// Redesign Phase 4 (docs/dashboard-redesign.md): the one shared
// container primitive every card/box in the app routes through. The
// static glass look, brand-colored edge, and idle breathing animation
// are plain CSS (.glow-card in globals.css, cheaper and simpler than
// animating them from React, and where prefers-reduced-motion is
// actually handled, see that file); this component only owns the two
// things that genuinely need pointer tracking, a cursor-following glow
// and a matching parallax tilt. Deliberately doesn't read
// useReducedMotion() itself: that hook's client-only first value can
// differ from its SSR value, and branching render output on it caused a
// real hydration mismatch here, this only ever moves the motion values
// in the pointer handlers below (never during render), and a
// reduced-motion user simply never triggers that movement client-side,
// same end result without the server/client split. glow picks which of
// the brand's three docs/brand-tokens.md colors this instance glows, so
// neighboring cards don't all carry the identical accent.
export function GlowCard({
  children,
  className,
  glow = 1,
  fill = false,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: GlowIndex;
  // The inner content wrapper is a plain block div by default, sized to
  // its own content, so a child relying on h-full (e.g. a fixed-height
  // sidebar card with its own internal flex-col + a flex-1
  // overflow-y-auto scroll region, see JourneyLogWidget) gets nothing
  // to actually fill, height:100% resolves against an auto-height
  // parent as auto. fill switches that wrapper to flex h-full flex-col
  // so the card's own resolved height (from flex-1 in a fixed-height
  // flex column, or a grid cell, etc.) actually propagates down.
  fill?: boolean;
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

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
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

  const { outer: outerClassName, inner: innerClassName } = splitOuterAndInnerClasses(className);

  return (
    <motion.div
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      style={{
        rotateX,
        rotateY,
        perspective: 800,
        ["--glow-color" as string]: `var(--glow-${glow})`,
      }}
      className={cn("glow-card group rounded-lg", outerClassName)}
    >
      <motion.div aria-hidden="true" className="glow-card-sheen" style={{ background: sheenBackground }} />
      <div className={cn("relative", fill && "flex h-full flex-col", innerClassName)}>{children}</div>
    </motion.div>
  );
}
