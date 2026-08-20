import Link from "next/link";
import { Calendar, Sparkles, Users, BarChart3 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const CARDS: { href: string; label: string; description: string; icon: LucideIcon }[] = [
  { href: "/calendar", label: "Content Calendar", description: "Plan and manage topics", icon: Calendar },
  { href: "/hook-library", label: "Hook Library", description: "Swipe file and live patterns", icon: Sparkles },
  { href: "/competitors", label: "Competitors", description: "Track and benchmark", icon: Users },
  { href: "/analytics", label: "Analytics Overview", description: "Performance at a glance", icon: BarChart3 },
];

// docs/topic-page-redesign.md Command Center redesign: Content Calendar,
// Hook Library, Competitors, and Analytics Overview moved off the top-bar
// nav and relocated here, a row of compact cards rather than a menu item,
// still one click away from Today.
export function QuickAccessCards() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {CARDS.map(({ href, label, description, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="rounded-lg border border-border p-3 transition-colors duration-150 hover:bg-muted/50"
        >
          <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
          <p className="mt-2 text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </Link>
      ))}
    </div>
  );
}
