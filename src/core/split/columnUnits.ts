/**
 * Legacy-friendly helpers for expressing stacked column heights in unit space.
 *
 * Most of the plugin now routes through `unitModel.ts`, but gutter dragging and
 * a few tests still benefit from these small explicit formulas.
 */
function normalizeUnits(units: number): number {
  return Math.max(1, Math.floor(units || 1));
}

export function computeColumnUnitHeightPx(units: number, unitPx: number, gutterPx: number): number {
  const safeUnits = normalizeUnits(units);
  return safeUnits * unitPx + Math.max(0, safeUnits - 1) * gutterPx;
}

/**
 * Computes the full rendered height of a vertical stack, including inter-panel
 * gutters. This mirrors the visual layout rather than just summing bare spans.
 */
export function computeColumnRootHeightPx(units: number[], unitPx: number, gutterPx: number): number {
  if (units.length === 0) {
    return 0;
  }

  return units.reduce(
    (total, unitsForPanel) => total + computeColumnUnitHeightPx(unitsForPanel, unitPx, gutterPx),
    0,
  ) + Math.max(0, units.length - 1) * gutterPx;
}

/**
 * Converts a measured pixel height back into units using a ceiling strategy so
 * content is never under-allocated.
 */
export function computeUnitsForMeasuredHeight(
  heightPx: number,
  unitPx: number,
  gutterPx: number,
): number {
  if (!Number.isFinite(heightPx) || heightPx <= 0) {
    return 1;
  }

  return Math.max(1, Math.ceil((heightPx + gutterPx) / Math.max(1, unitPx + gutterPx)));
}
