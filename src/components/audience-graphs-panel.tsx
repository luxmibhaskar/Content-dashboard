"use client";

import { useRef, useSyncExternalStore } from "react";
import { GlowCard } from "@/components/glow-card";
import { AudienceGrowthChart } from "@/components/charts/audience-growth-chart";
import { AudienceSecondaryChart } from "@/components/charts/audience-secondary-chart";
import type {
  AudienceDistributionPoint,
  AudienceGrowthPoint,
  GrowthVelocityPoint,
  OutputVsMilestonePoint,
} from "@/lib/audience-growth";

// Layout follow-up: persists the same way the dark/light theme does
// (src/components/theme-toggle.tsx), a localStorage-backed
// useSyncExternalStore rather than useState+useEffect, this codebase's
// react-hooks/set-state-in-effect lint rule blocks setting state
// synchronously on mount, and useSyncExternalStore's getServerSnapshot
// handles the SSR/hydration split correctly for free (server has no
// localStorage, so it always renders the default split; the client
// reads the real one on its first paint, no flash-inducing effect
// needed since the default IS a reasonable render either way).
const STORAGE_KEY = "audience-graphs-split";
const DEFAULT_SPLIT = 50;
const MIN_SPLIT = 20;
const MAX_SPLIT = 80;

const listeners = new Set<() => void>();

function clampSplit(value: number) {
  return Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, value));
}

function getSplitSnapshot(): number {
  const raw = localStorage.getItem(STORAGE_KEY);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? clampSplit(parsed) : DEFAULT_SPLIT;
}

function getServerSplitSnapshot(): number {
  return DEFAULT_SPLIT;
}

function setSplit(next: number) {
  localStorage.setItem(STORAGE_KEY, String(clampSplit(next)));
  listeners.forEach((listener) => listener());
}

function subscribeToSplit(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function AudienceGraphsPanel({
  audienceGrowth,
  distribution,
  velocity,
  outputVsMilestone,
}: {
  audienceGrowth: AudienceGrowthPoint[];
  distribution: AudienceDistributionPoint[];
  velocity: GrowthVelocityPoint[];
  outputVsMilestone: OutputVsMilestonePoint[];
}) {
  const split = useSyncExternalStore(subscribeToSplit, getSplitSnapshot, getServerSplitSnapshot);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  function updateFromPointer(clientX: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setSplit(((clientX - rect.left) / rect.width) * 100);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    updateFromPointer(e.clientX);
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowLeft") setSplit(split - 5);
    else if (e.key === "ArrowRight") setSplit(split + 5);
    else if (e.key === "Home") setSplit(MIN_SPLIT);
    else if (e.key === "End") setSplit(MAX_SPLIT);
    else return;
    e.preventDefault();
  }

  return (
    <GlowCard glow={2} className="p-4">
      <div ref={containerRef} className="relative flex flex-col md:flex-row">
        <section
          className="w-full md:[width:var(--split-left)]"
          style={{ ["--split-left" as string]: `calc(${split}% - 12px)` }}
        >
          <h2 className="text-sm font-medium text-muted-foreground">Total Audience Growth</h2>
          <div className="mt-2">
            <AudienceGrowthChart data={audienceGrowth} />
          </div>
        </section>

        {/* Drag handle: desktop only, the split has nothing to divide
            once the two sides stack on mobile. A wider invisible hit
            area than the visible line, easier to grab without needing
            pixel precision. */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize Total Audience Growth and Audience & Output panels"
          aria-valuenow={Math.round(split)}
          aria-valuemin={MIN_SPLIT}
          aria-valuemax={MAX_SPLIT}
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onKeyDown={handleKeyDown}
          className="hidden w-6 shrink-0 cursor-col-resize touch-none items-stretch justify-center outline-none md:flex hover:[&>div]:bg-primary focus-visible:[&>div]:bg-primary active:[&>div]:bg-primary"
        >
          <div className="w-px bg-border transition-colors" />
        </div>

        <section
          className="mt-6 w-full md:mt-0 md:[width:var(--split-right)]"
          style={{ ["--split-right" as string]: `calc(${100 - split}% - 12px)` }}
        >
          <h2 className="text-sm font-medium text-muted-foreground">Audience &amp; Output</h2>
          <div className="mt-2">
            <AudienceSecondaryChart
              distribution={distribution}
              velocity={velocity}
              outputVsMilestone={outputVsMilestone}
            />
          </div>
        </section>
      </div>
    </GlowCard>
  );
}
