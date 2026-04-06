export function setSplitRootHorizontalInset(root: HTMLElement, enabled: boolean) {
  root.style.paddingLeft = enabled ? 'var(--cnt-hp)' : '0px';
  root.style.paddingRight = enabled ? 'var(--cnt-hp)' : '0px';
}
