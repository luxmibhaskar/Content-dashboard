// Top bar rebuild (docs/dashboard-redesign.md "Layout follow-ups"): given
// an ordered list of item widths and a pixel budget, decide how many
// leading items don't fit and should move into the MoreMenu overflow.
// TopBar calls this once per grid side column.
//
// No hysteresis / debounce, deliberately: the classic priority-nav
// flicker comes from a measure -> mutate -> re-measure feedback loop.
// Here the side columns are fixed-fraction grid tracks (minmax(0,1fr)),
// so collapsing or expanding an item never changes the measured budget
// or any item width. Nothing feeds back, so a plain stateless recompute
// is stable.

/**
 * How many leading items of `slotWidths` should collapse into overflow.
 * `slotWidths` MUST be ordered first-to-collapse. Returns 0 until every
 * input is measured (`budget` known, all widths > 0, `gap` finite), so
 * SSR and first paint render everything expanded.
 */
export function computeOverflowCollapse(
  budget: number | null,
  slotWidths: number[],
  gap: number,
): number {
  if (budget == null || !Number.isFinite(gap) || slotWidths.some((w) => !(w > 0))) {
    return 0;
  }

  const n = slotWidths.length;
  for (let collapsed = 0; collapsed <= n; collapsed++) {
    const kept = slotWidths.slice(collapsed);
    let need = 0;
    for (let i = 0; i < kept.length; i++) {
      need += kept[i] + (i > 0 ? gap : 0);
    }
    if (need <= budget) return collapsed;
  }
  return n;
}
