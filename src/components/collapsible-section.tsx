// Redesign Phase 4: <details> can't be a GlowCard (that component's
// pointer-tracked tilt/sheen assume a plain motion.div, and a native
// disclosure widget's own semantics are worth keeping intact), so this
// applies the same .glow-card CSS class directly instead, glass +
// brand-glow + idle breathing, just without the cursor-follow effects.
export function CollapsibleSection({
  title,
  defaultOpen = false,
  glow = 3,
  neutral = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  glow?: 1 | 2 | 3;
  // Same reasoning as GlowCard's own neutral prop (glow-card.tsx):
  // glow-1/2/3 are the brand's pillar colors, wrong to use (cycled or
  // fixed) on a section that isn't grouping genuinely pillar-tagged
  // content, e.g. Hook Library's Visual/Text/Verbal delivery-mode
  // groups, a categorization with nothing to do with pillars.
  neutral?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      data-collapsible-section
      open={defaultOpen}
      className="glow-card group overflow-hidden rounded-lg"
      data-neutral={neutral ? "true" : undefined}
      style={{ ["--glow-color" as string]: neutral ? "var(--primary)" : `var(--glow-${glow})` }}
    >
      <summary className="relative cursor-pointer list-none px-4 py-3 text-sm font-medium select-none marker:hidden transition-colors duration-150 ease-out hover:bg-muted/40 active:bg-muted/60">
        <span className="mr-2 inline-block transition-transform group-open:rotate-90">
          &rsaquo;
        </span>
        {title}
      </summary>
      <div className="relative space-y-4 border-t border-border px-4 py-4">{children}</div>
    </details>
  );
}
