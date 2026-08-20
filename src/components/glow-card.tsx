"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

type GlowIndex = 1 | 2 | 3;

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
      className={cn("glow-card group rounded-lg", className)}
    >
      <motion.div aria-hidden="true" className="glow-card-sheen" style={{ background: sheenBackground }} />
      <div className={cn("relative", fill && "flex h-full flex-col")}>{children}</div>
    </motion.div>
  );
}
