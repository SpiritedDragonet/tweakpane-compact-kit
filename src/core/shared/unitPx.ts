/**
 * Resolves the effective Tweakpane unit height for a subtree.
 *
 * The split system tries hard to stay within Tweakpane's own sizing model
 * instead of inventing a parallel track size. The resolver first looks for a
 * nearby native container and only falls back to direct measurement when
 * necessary.
 */
import { measureCssUnit, readUnitPx } from './measure';

/**
 * Walks upward to find the nearest element that actually participates in
 * Tweakpane's container sizing rules.
 */
export function findUnitMeasurementAnchor(el: HTMLElement): HTMLElement {
  let cur: HTMLElement | null = el;

  while (cur) {
    if (cur.classList?.contains('tp-cntv') || cur.classList?.contains('tp-rotv')) {
      return cur;
    }
    cur = cur.parentElement;
  }

  return el.ownerDocument.body || el;
}

/**
 * Returns the unit height in pixels, preferring stable reads before resorting
 * to a DOM probe.
 */
export function resolveUnitPx(
  root: HTMLElement,
  options: { anchor?: HTMLElement | null; fallback?: number } = {},
): number {
  const fallback = options.fallback ?? 0;
  const anchor = options.anchor || findUnitMeasurementAnchor(root);

  return (
    readUnitPx(anchor, 0)
    || readUnitPx(root, 0)
    || measureCssUnit(anchor, '--cnt-usz', 0, root)
    || measureCssUnit(root, '--cnt-usz', 0, anchor)
    || fallback
  );
}
