/**
 * Canonical unit semantics for split layout.
 *
 * Every vertical sizing rule eventually reduces to this tree model:
 * - fixed nodes always stay at their base units
 * - adaptive nodes can grow above base units
 * - row nodes take the tallest child
 * - column nodes sum visible children
 */
export type UnitQuantization = 'safe' | 'tight';

export type UnitNode =
  | { kind: 'empty'; baseUnits: 0; hidden?: boolean }
  | { kind: 'fixed'; baseUnits: number; liveUnits?: number; hidden?: boolean }
  | { kind: 'adaptive'; baseUnits: number; liveUnits?: number; hidden?: boolean }
  | { kind: 'row'; baseUnits: number; children: UnitNode[]; hidden?: boolean }
  | { kind: 'column'; baseUnits: number; children: UnitNode[]; hidden?: boolean };

function toNonNegativeInteger(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.floor(value));
}

/**
 * Converts an integer span into rendered pixels using the shared
 * `units * unitPx + gutters` formula.
 */
export function computeSpanHeightPx(units: number, unitPx: number, gutterPx: number): number {
  const safeUnits = toNonNegativeInteger(units);
  if (safeUnits <= 0) {
    return 0;
  }
  return safeUnits * unitPx + Math.max(0, safeUnits - 1) * gutterPx;
}

/**
 * Quantizes measured DOM height back into units.
 *
 * `safe` rounds upward to avoid clipping. `tight` is available for places that
 * intentionally want a closer fit.
 */
export function computeMeasuredUnits(
  heightPx: number,
  unitPx: number,
  gutterPx: number,
  strategy: UnitQuantization = 'safe',
): number {
  if (!Number.isFinite(heightPx) || heightPx <= 0) {
    return 0;
  }

  const raw = (Math.max(0, heightPx) + gutterPx) / Math.max(1, unitPx + gutterPx);
  const quantized = strategy === 'tight' ? Math.round(raw) : Math.ceil(raw);
  return Math.max(0, quantized);
}

/**
 * Evaluates a unit tree to the live span the layout engine should honor.
 */
export function computeNodeLiveUnits(node: UnitNode): number {
  if (node.hidden) {
    return 0;
  }

  switch (node.kind) {
    case 'empty':
      return 0;
    case 'fixed':
      return toNonNegativeInteger(node.baseUnits);
    case 'adaptive':
      return Math.max(
        toNonNegativeInteger(node.baseUnits),
        toNonNegativeInteger(node.liveUnits ?? node.baseUnits),
      );
    case 'row':
      return Math.max(
        toNonNegativeInteger(node.baseUnits),
        ...node.children.map((child) => computeNodeLiveUnits(child)),
        0,
      );
    case 'column':
      return Math.max(
        toNonNegativeInteger(node.baseUnits),
        node.children.reduce((sum, child) => sum + computeNodeLiveUnits(child), 0),
      );
  }
}
