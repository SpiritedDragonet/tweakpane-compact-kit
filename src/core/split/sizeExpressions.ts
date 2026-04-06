/**
 * Parser and adapters for horizontal size expressions.
 *
 * Public input can be ratios, `fr`, pixels, or percentages. We normalize those
 * syntaxes into a tiny token set that the geometry layer can reason about
 * without remembering the original surface syntax.
 */
import { computeSplitGeometry } from './singleGeometry';

export type SizeToken =
  | { kind: 'ratio'; value: number }
  | { kind: 'fr'; value: number }
  | { kind: 'px'; value: number }
  | { kind: 'percent'; value: number };

export type FlexSpec = {
  grow: number;
  shrink: number;
  basis: string;
};

function parsePositiveNumber(raw: string): number {
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Counts how many panes an expression implies so callers can reconcile omitted
 * children with omitted size terms.
 */
export function countSizeParts(input: number[] | string | undefined, fallbackCount = 2): number {
  if (!input) return fallbackCount;
  if (Array.isArray(input)) return input.length || fallbackCount;
  if (input === 'equal') return fallbackCount;

  const parts = input.trim().split(/\s+/).filter(Boolean);
  return parts.length || fallbackCount;
}

/**
 * Converts the public size expression into normalized tokens.
 */
export function parseSizeExpression(input: number[] | string | undefined, fallbackCount = 2): SizeToken[] {
  if (!input) {
    return Array.from({ length: fallbackCount }, () => ({ kind: 'ratio', value: 1 as number }));
  }

  if (Array.isArray(input)) {
    if (input.length === 0) {
      return Array.from({ length: fallbackCount }, () => ({ kind: 'ratio', value: 1 as number }));
    }

    return input.map((value) => ({
      kind: 'ratio' as const,
      value: Number.isFinite(value) && value > 0 ? value : 1,
    }));
  }

  if (input === 'equal') {
    return Array.from({ length: fallbackCount }, () => ({ kind: 'ratio', value: 1 as number }));
  }

  const parts = input.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return Array.from({ length: fallbackCount }, () => ({ kind: 'ratio', value: 1 as number }));
  }

  return parts.map((part) => {
    if (part.endsWith('fr')) {
      return { kind: 'fr' as const, value: parsePositiveNumber(part) || 1 };
    }
    if (part.endsWith('px')) {
      return { kind: 'px' as const, value: parsePositiveNumber(part) };
    }
    if (part.endsWith('%')) {
      return { kind: 'percent' as const, value: parsePositiveNumber(part) };
    }
    return { kind: 'ratio' as const, value: parsePositiveNumber(part) || 1 };
  });
}

/**
 * Resolves each token to its pre-cut width on the virtual axis used by the
 * single-geometry model.
 */
export function resolveSizeTokens(tokens: SizeToken[], containerPx: number, gutterPx = 0): number[] {
  return computeSplitGeometry(tokens, containerPx, gutterPx).preCutPx;
}

/**
 * Older flex-based callers still use this adapter. Newer row layout paths
 * prefer `singleGeometry.ts`, but keeping this helper makes the token layer
 * usable from both styles.
 */
export function toFlexSpec(token: SizeToken | undefined, fallbackWeight: number): FlexSpec {
  if (!token || token.kind === 'ratio' || token.kind === 'fr') {
    return {
      grow: Math.max(0.0001, token?.value ?? fallbackWeight),
      shrink: 0,
      basis: '0px',
    };
  }

  if (token.kind === 'px') {
    return {
      grow: 0,
      shrink: 0,
      basis: `${token.value}px`,
    };
  }

  return {
    grow: 0,
    shrink: 0,
    basis: `${token.value}%`,
  };
}
