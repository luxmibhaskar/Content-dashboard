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
}: {
  children: React.ReactNode;
  className?: string;
  glow?: GlowIndex;
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

  return (
    <motion.div
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{
        rotateX,
        rotateY,
        perspective: 800,
        ["--glow-color" as string]: `var(--glow-${glow})`,
      }}
      className={cn("glow-card group rounded-lg", className)}
    >
      <motion.div aria-hidden="true" className="glow-card-sheen" style={{ background: sheenBackground }} />
      <div className="relative">{children}</div>
    </motion.div>
  );
}
