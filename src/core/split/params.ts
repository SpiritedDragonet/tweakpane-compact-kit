/**
 * Normalizes the public split-layout params into one internal shape.
 *
 * This is also where we retire old entry points. Rejecting legacy spellings
 * early keeps the rest of the layout code free from compatibility branches.
 */
import { countSizeParts, parseSizeExpression, type SizeToken } from './sizeExpressions';
import type { SplitDirection, SplitLayoutNode, SplitLayoutParams } from '../SplitLayoutPlugin';

export type NormalizedSplitLayoutParams = {
  view: 'split-layout';
  direction: SplitDirection;
  sizes: SizeToken[];
  children: SplitLayoutNode[];
  units: number;
  gutter: number;
  minSize: number;
  interactive: boolean;
  compactSliders: boolean;
};

function parseNumericSetting(value: number | string | undefined, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

export function normalizeSplitParams(input: SplitLayoutParams & Record<string, unknown>): NormalizedSplitLayoutParams {
  if ('gap' in input) {
    throw new Error('Use `gutter`; `gap` is not supported.');
  }
  if ('rowUnits' in input) {
    throw new Error('`rowUnits` has been retired; use `units`.');
  }
  if ('height' in input) {
    throw new Error('`height` has been retired; use `units`.');
  }

  const p = { ...input };
  const direction: SplitDirection = p.direction === 'column' ? 'column' : 'row';
  const children: SplitLayoutNode[] = Array.isArray(p.children) ? p.children.slice() : [];

  const sizeCount = countSizeParts(p.sizes, children.length || 2);
  let panelCount = Math.max(children.length || 0, sizeCount);
  if (panelCount <= 0) {
    panelCount = 2;
  }

  // Missing children are padded with generic leaf slots so the size expression
  // remains authoritative about arity.
  while (children.length < panelCount) {
    children.push('leaf');
  }

  return {
    view: 'split-layout',
    direction,
    sizes: parseSizeExpression(p.sizes, panelCount),
    children,
    units: Math.max(0, Math.floor(typeof p.units === 'number' && Number.isFinite(p.units) ? p.units : 0)),
    gutter: parseNumericSetting(p.gutter, 4),
    minSize: typeof p.minSize === 'number' ? p.minSize : 20,
    interactive: !!p.interactive,
    compactSliders: p.compactSliders !== false,
  };
}
