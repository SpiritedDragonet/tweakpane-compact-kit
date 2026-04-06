/**
 * Applies the horizontal inset contract for split roots.
 *
 * Top-level rows should visually align with native full-width controls, while
 * nested structural splits should not accumulate another copy of that inset.
 */
export function setSplitRootHorizontalInset(root: HTMLElement, enabled: boolean) {
  root.style.paddingLeft = enabled ? 'var(--cnt-hp)' : '0px';
  root.style.paddingRight = enabled ? 'var(--cnt-hp)' : '0px';
}
