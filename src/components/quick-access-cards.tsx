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
          <GlowCard neutral className="p-3 transition-colors duration-150 hover:bg-muted/30">
            {/* Refinement 5: icon + label are this card's "nearer" plane
                (a couple px of extra parallax shift), the description
                stays still as the body plane beneath it. */}
            <GlowCardParallax depth={4}>
              <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
              <p className="mt-2 text-sm font-medium">{label}</p>
            </GlowCardParallax>
            <p className="text-xs text-muted-foreground">{description}</p>
          </GlowCard>
        </Link>
      ))}
    </div>
  );
}
