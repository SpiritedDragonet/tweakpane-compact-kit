/**
 * Shared button shell used by both custom button plugins.
 *
 * The shell owns the DOM shape, height formula, and declared unit metadata.
 * Higher-level plugins only decide what content to render and how button state
 * should react to user input.
 */
import { resolveUnitPx } from '../shared/unitPx';
import { setDeclaredUnitState } from '../split/domUnitState';

export type ButtonShellState = {
  pressed?: boolean;
  accentColor?: string;
};

type ButtonShellOptions = {
  rootClassName: string;
  units: number;
  state?: ButtonShellState;
  iconSize?: number;
};

/**
 * Creates a Tweakpane-compatible button subtree and returns a tiny imperative
 * interface for updating its size and visual state.
 */
export function createButtonShell(doc: Document, options: ButtonShellOptions) {
  const root = doc.createElement('div');
  root.className = options.rootClassName;

  const wrapper = doc.createElement('div');
  wrapper.className = 'tp-btnv';
  root.appendChild(wrapper);

  const button = doc.createElement('button');
  button.className = 'tp-btnv_b';
  wrapper.appendChild(button);

  const contentHost = doc.createElement('span');
  contentHost.className = 'tp-btnv_c';
  button.appendChild(contentHost);

  const setUnits = (units: number) => {
    const safeUnits = Math.max(1, Math.floor(units || 1));
    const unitPx = resolveUnitPx(root);
    const gutter = 4;

    // Buttons are fixed-height atomic controls in the split-layout model, so we
    // publish their unit contract directly on the root element for parent hosts.
    setDeclaredUnitState(root, {
      baseUnits: safeUnits,
      liveUnits: safeUnits,
      behavior: 'fixed',
    });

    // Height uses the same "N tracks + (N - 1) gutters" formula as column spans.
    if (unitPx > 0) {
      button.style.height = `${safeUnits * unitPx + (safeUnits - 1) * gutter}px`;
      return;
    }

    button.style.height = `calc(var(--cnt-usz) * ${safeUnits} + ${(safeUnits - 1) * gutter}px)`;
  };

  const setIconSize = (iconSize: number | undefined) => {
    const safeSize = typeof iconSize === 'number' && Number.isFinite(iconSize)
      ? Math.max(12, Math.round(iconSize))
      : null;

    if (safeSize === null) {
      button.style.removeProperty('--tp-btnc-icon-size');
      return;
    }

    button.style.setProperty('--tp-btnc-icon-size', `${safeSize}px`);
  };

  const setState = (state: ButtonShellState) => {
    if (state.pressed) root.dataset.buttonPressed = 'true';
    else delete root.dataset.buttonPressed;

    if (state.accentColor) button.style.setProperty('--tp-btn-accent', state.accentColor);
    else button.style.removeProperty('--tp-btn-accent');
  };

  setUnits(options.units);
  setIconSize(options.iconSize);
  setState(options.state ?? {});

  return {
    root,
    button,
    contentHost,
    setUnits,
    setIconSize,
    setState,
  };
}
