/**
 * Single-geometry row sizing model.
 *
 * All row expressions are evaluated on one virtual axis whose length is
 * `container + gutter`. Each pane first receives a "pre-cut" span on that axis,
 * then each pane exposes only `span - gutter` as visible width. That single
 * rule keeps gutters naturally aligned across ratios, `fr`, percentages, and
 * fixed pixel terms without special casing.
 */
import type { SizeToken } from './sizeExpressions';

type SplitGeometry = {
  virtualPx: number;
  preCutPx: number[];
  visiblePx: number[];
  dividerStartsPx: number[];
};

function formatPx(value: number): string {
  return `${value}px`;
}

// The virtual axis includes one gutter so each pane can be "cut" symmetrically
// by a full gutter while the visible gaps still add up to the real gutter size.
function buildVirtualExpr(gutterPx: number): string {
  if (gutterPx === 0) {
    return '100%';
  }
  return `(100% + ${formatPx(gutterPx)})`;
}

function buildPercentPreCutExpr(percent: number, gutterPx: number): string {
  return `(${buildVirtualExpr(gutterPx)} * ${percent} / 100)`;
}

function buildFixedPreCutExpr(token: SizeToken, gutterPx: number): string | null {
  if (token.kind === 'px') {
    return formatPx(token.value);
  }
  if (token.kind === 'percent') {
    return buildPercentPreCutExpr(token.value, gutterPx);
  }
  return null;
}

function resolveFixedPreCutPx(token: SizeToken, containerPx: number, gutterPx: number): number {
  if (token.kind === 'px') {
    return token.value;
  }
  if (token.kind === 'percent') {
    return (token.value / 100) * (containerPx + gutterPx);
  }
  return 0;
}

function getFlexibleWeight(tokens: SizeToken[]): number {
  return tokens.reduce((sum, token) => {
    if (token.kind === 'px' || token.kind === 'percent') {
      return sum;
    }
    return sum + token.value;
  }, 0);
}

function getReservedPreCutPx(tokens: SizeToken[], containerPx: number, gutterPx: number): number {
  return tokens.reduce((sum, token) => sum + resolveFixedPreCutPx(token, containerPx, gutterPx), 0);
}

function buildRemainingExpr(tokens: SizeToken[], gutterPx: number): string {
  const fixedTerms = tokens
    .map((token) => buildFixedPreCutExpr(token, gutterPx))
    .filter((term): term is string => term !== null);

  return fixedTerms.reduce(
    (expr, term) => `${expr} - ${term}`,
    buildVirtualExpr(gutterPx),
  );
}

export function computeSplitGeometry(
  tokens: SizeToken[],
  containerPx: number,
  gutterPx: number,
): SplitGeometry {
  const safeContainerPx = Math.max(0, containerPx);
  const safeGutterPx = Math.max(0, gutterPx);
  const virtualPx = safeContainerPx + safeGutterPx;
  const reservedPreCutPx = getReservedPreCutPx(tokens, safeContainerPx, safeGutterPx);
  const flexibleWeight = getFlexibleWeight(tokens);
  const remainingPreCutPx = Math.max(0, virtualPx - reservedPreCutPx);

  const preCutPx = tokens.map((token) => {
    if (token.kind === 'px' || token.kind === 'percent') {
      return resolveFixedPreCutPx(token, safeContainerPx, safeGutterPx);
    }
    if (flexibleWeight <= 0) {
      return 0;
    }
    return (token.value / flexibleWeight) * remainingPreCutPx;
  });

  // Every pane "pays" one gutter from its pre-cut share; adjacent panes then
  // meet with exactly one real gutter between them.
  const visiblePx = preCutPx.map((span) => Math.max(0, span - safeGutterPx));
  const dividerStartsPx: number[] = [];
  let cursorPx = 0;

  for (let i = 0; i < visiblePx.length - 1; i += 1) {
    cursorPx += visiblePx[i];
    dividerStartsPx.push(cursorPx);
    cursorPx += safeGutterPx;
  }

  return {
    virtualPx,
    preCutPx,
    visiblePx,
    dividerStartsPx,
  };
}

/**
 * Produces CSS `flex-basis` expressions that mirror the same geometry model
 * used by the numeric resolver above.
 */
export function buildVisibleBasisCss(tokens: SizeToken[], gutterPx: number): string[] {
  const safeGutterPx = Math.max(0, gutterPx);
  const flexibleWeight = getFlexibleWeight(tokens);
  const remainingExpr = buildRemainingExpr(tokens, safeGutterPx);

  return tokens.map((token) => {
    const fixedExpr = buildFixedPreCutExpr(token, safeGutterPx);
    if (fixedExpr) {
      return safeGutterPx === 0
        ? fixedExpr
        : `calc(${fixedExpr} - ${formatPx(safeGutterPx)})`;
    }
    if (flexibleWeight <= 0) {
      return '0px';
    }
    const preCutExpr = `((${remainingExpr}) * ${token.value} / ${flexibleWeight})`;
    return safeGutterPx === 0
      ? preCutExpr
      : `calc(${preCutExpr} - ${formatPx(safeGutterPx)})`;
  });
}
