import { cn } from "@/lib/utils";

// Redesign Phase 4: <details> can't be a GlowCard (that component's
// pointer-tracked tilt/sheen assume a plain motion.div, and a native
// disclosure widget's own semantics are worth keeping intact), so this
// applies the same .glow-card CSS class directly instead, glass +
// brand-glow + idle breathing, just without the cursor-follow effects.
export function CollapsibleSection({
  title,
  titleSuffix,
  defaultOpen = false,
  glow = 3,
  neutral = false,
  contentClassName,
  summaryClassName,
  children,
}: {
  title: string;
  // Rendered right after the title text, inside the always-visible
  // summary - the one place content can still show while collapsed.
  // Built for MarkerCountBadge (manual-workflow-ui.tsx): a section with
  // a [VERIFY]/[PERSONAL INPUT NEEDED]/[EXAMPLE NEEDED] marker somewhere
  // inside it needs to say so without forcing it open first. Optional
  // and inline (not a flex layout change) so every existing call site
  // (Sources, Original pasted text, competitor profile cards) is
  // unaffected.
  titleSuffix?: React.ReactNode;
  defaultOpen?: boolean;
  glow?: 1 | 2 | 3;
  // Same reasoning as GlowCard's own neutral prop (glow-card.tsx):
  // glow-1/2/3 are the brand's pillar colors, wrong to use (cycled or
  // fixed) on a section that isn't grouping genuinely pillar-tagged
  // content, e.g. Hook Library's Visual/Text/Verbal delivery-mode
  // groups, a categorization with nothing to do with pillars.
  neutral?: boolean;
  // Escape hatch for a call site that needs even more than the default
  // below (e.g. an unusually tall content list); merged via cn(), so it
  // only overrides whichever side it names.
  contentClassName?: string;
  summaryClassName?: string;
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
      {/* pb-6 on both, not the more obvious-looking py-4/py-3: every
          .glow-card (globals.css) carries a decorative ::after "inner
          offset pane" inset 6px/18px/18px/6px (top/right/bottom/left).
          At a plain py-4 (content) or py-3 (summary), 16px/12px of real
          padding sits inside that 18px bottom inset, so text read as
          crowded against the pane's edge, most visible in the collapsed
          state, where the summary's own padding is the entire visible
          card. This is a defect in this shared default, not any one
          call site's content, so it's fixed once here rather than
          opted into per collapsible - every CollapsibleSection in the
          app gets the clearance, not just the two it was first noticed
          on (System & Services, Live Status & Backup). Top padding is
          untouched, well clear of the pane's 6px top inset already. */}
      <summary
        className={cn(
          "relative cursor-pointer list-none px-4 pt-3 pb-6 text-sm font-medium select-none marker:hidden transition-colors duration-150 ease-out hover:bg-muted/40 active:bg-muted/60",
          summaryClassName,
        )}
      >
        <span className="mr-2 inline-block transition-transform group-open:rotate-90">
          &rsaquo;
        </span>
        {title}
        {titleSuffix && <span className="ml-2 align-middle">{titleSuffix}</span>}
      </summary>
      <div
        className={cn(
          "relative space-y-4 border-t border-border px-4 pt-4 pb-6",
          contentClassName,
        )}
      >
        {children}
      </div>
    </details>
  );
}
