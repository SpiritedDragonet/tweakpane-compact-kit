/**
 * DOM-level unit metadata bridge.
 *
 * Custom controls can publish their span contract directly onto DOM elements so
 * the split layout does not need hard-coded knowledge about every control type.
 */
export type DeclaredUnitBehavior = 'fixed' | 'adaptive';

export type DeclaredUnitState = {
  baseUnits: number;
  liveUnits: number;
  behavior: DeclaredUnitBehavior;
};

export type SplitDomUnitOptions = {
  liveUnits?: number;
  behavior?: DeclaredUnitBehavior;
  syncHeight?: boolean;
  gutterPx?: number;
};

function toUnits(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return Math.max(0, parsed);
    }
  }

  return 0;
}

/**
 * Reads unit metadata from `data-*` attributes when a control has opted into
 * the split-layout contract.
 */
export function readDeclaredUnitState(el: HTMLElement): DeclaredUnitState | null {
  const behavior = el.dataset.splitUnitBehavior;
  if (behavior !== 'fixed' && behavior !== 'adaptive') {
    return null;
  }

  const baseUnits = toUnits(el.dataset.splitBaseUnits);
  const liveUnits = Math.max(baseUnits, toUnits(el.dataset.splitLiveUnits));

  return {
    baseUnits,
    liveUnits,
    behavior,
  };
}

/**
 * Writes normalized unit metadata back to the DOM.
 */
export function setDeclaredUnitState(el: HTMLElement, state: DeclaredUnitState) {
  const baseUnits = Math.max(0, Math.floor(state.baseUnits));
  const liveUnits = Math.max(baseUnits, Math.floor(state.liveUnits));

  el.dataset.splitBaseUnits = String(baseUnits);
  el.dataset.splitLiveUnits = String(liveUnits);
  el.dataset.splitUnitBehavior = state.behavior;
}

function formatDeclaredHeight(units: number, gutterPx: number) {
  const safeUnits = Math.max(0, Math.floor(units));
  if (safeUnits <= 0) {
    return '0px';
  }
  return `calc(var(--cnt-usz) * ${safeUnits} + ${(safeUnits - 1) * Math.max(0, gutterPx)}px)`;
}

/**
 * Public helper for plain DOM hosts that should opt into the split unit
 * contract.
 *
 * Use this when a DOM region should occupy a declared number of units and let
 * the plugin keep both the split metadata and the host height in sync.
 */
export function setSplitDomUnits(
  el: HTMLElement,
  baseUnits: number,
  options?: SplitDomUnitOptions,
) {
  const safeBaseUnits = Math.max(0, Math.floor(baseUnits));
  const safeLiveUnits = Math.max(
    safeBaseUnits,
    Math.floor(options?.liveUnits ?? safeBaseUnits),
  );
  const behavior = options?.behavior ?? 'fixed';

  setDeclaredUnitState(el, {
    baseUnits: safeBaseUnits,
    liveUnits: safeLiveUnits,
    behavior,
  });

  if (options?.syncHeight !== false) {
    el.style.height = formatDeclaredHeight(safeLiveUnits, options?.gutterPx ?? 4);
  }
}

/**
 * Copies the published unit contract from one wrapper element to another. This
 * is useful when Tweakpane inserts an extra binding shell around a custom view.
 */
export function copyDeclaredUnitState(source: HTMLElement, target: HTMLElement) {
  const state = readDeclaredUnitState(source);
  if (!state) {
    delete target.dataset.splitBaseUnits;
    delete target.dataset.splitLiveUnits;
    delete target.dataset.splitUnitBehavior;
    return;
  }

  setDeclaredUnitState(target, state);
}
