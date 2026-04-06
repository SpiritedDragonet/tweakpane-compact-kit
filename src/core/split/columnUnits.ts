function normalizeUnits(units: number): number {
  return Math.max(1, Math.floor(units || 1));
}

export function computeColumnUnitHeightPx(units: number, unitPx: number, gutterPx: number): number {
  const safeUnits = normalizeUnits(units);
  return safeUnits * unitPx + Math.max(0, safeUnits - 1) * gutterPx;
}

export function computeColumnRootHeightPx(units: number[], unitPx: number, gutterPx: number): number {
  if (units.length === 0) {
    return 0;
  }

  return units.reduce(
    (total, unitsForPanel) => total + computeColumnUnitHeightPx(unitsForPanel, unitPx, gutterPx),
    0,
  ) + Math.max(0, units.length - 1) * gutterPx;
}

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
