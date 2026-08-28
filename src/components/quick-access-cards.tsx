import Link from "next/link";
import { Calendar, Sparkles, Users, BarChart3 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { GlowCard, GlowCardParallax } from "@/components/glow-card";

const CARDS: { href: string; label: string; description: string; icon: LucideIcon }[] = [
  { href: "/calendar", label: "Content Calendar", description: "Plan and manage topics", icon: Calendar },
  { href: "/hook-library", label: "Hook Library", description: "Swipe file and live patterns", icon: Sparkles },
  { href: "/competitors", label: "Competitors", description: "Track and benchmark", icon: Users },
  { href: "/analytics", label: "Analytics Overview", description: "Performance at a glance", icon: BarChart3 },
];

// docs/topic-page-redesign.md Command Center redesign: Content Calendar,
// Hook Library, Competitors, and Analytics Overview moved off the top-bar
// nav and relocated here, a row of compact cards rather than a menu item,
// still one click away from Dashboard. neutral, not a cycled glow index:
// these are navigation shortcuts to whole app sections, nothing to do
// with any one pillar, so pillar-coloring them (even cycled for variety)
// implied a categorization that isn't real. See GlowCard's neutral prop.
export function QuickAccessCards() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {CARDS.map(({ href, label, description, icon: Icon }) => (
        <Link key={href} href={href}>
          {/* pb-5, not the plain p-3 every side else uses: .glow-card::after
              (globals.css) insets 18px from the bottom, a bare p-3 (12px)
              sat inside that zone, reading as the description line
              crowding the card's own decorative inner pane. Same defect
              CollapsibleSection's default padding had (collapsible-section.tsx),
              fixed the same way, just per-instance here since GlowCard's
              own default (p-4 at most call sites) isn't uniformly tight
              enough everywhere to justify changing app-wide, this one
              compact 3-line card genuinely was. */}
          <GlowCard neutral className="p-3 pb-5 transition-colors duration-150 hover:bg-muted/30">
            {/* Refinement 5: icon + label are this card's "nearer" plane
                (a couple px of extra parallax shift), the description
                stays still as the body plane beneath it. */}
            <GlowCardParallax depth={4}>
              <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
              <p className="mt-2 text-sm font-medium">{label}</p>
            </GlowCardParallax>
            {/* line-clamp-2 + min-h-8 (two text-xs lines) pin every card's
                description to the same two-line box: without it the one
                longer string ("Swipe file and live patterns") wraps to an
                extra line at mobile widths where the other three don't,
                and CSS grid's per-row stretch drags that whole row taller
                than the other. Fixed box, no copy change, robust to width
                and future edits. */}
            <p className="text-xs text-muted-foreground line-clamp-2 min-h-8">{description}</p>
          </GlowCard>
        </Link>
      ))}
    </div>
  );
}
