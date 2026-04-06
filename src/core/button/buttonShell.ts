import { measureCssUnit, readUnitPx } from '../shared/measure';
import { setDeclaredUnitState } from '../split/domUnitState';

export type ButtonShellState = {
  pressed?: boolean;
  accentColor?: string;
};

type ButtonShellOptions = {
  rootClassName: string;
  units: number;
  state?: ButtonShellState;
};

function findMeasurementAnchor(el: HTMLElement): HTMLElement {
  let cur: HTMLElement | null = el;

  while (cur) {
    if (cur.classList?.contains('tp-cntv') || cur.classList?.contains('tp-rotv')) {
      return cur;
    }
    cur = cur.parentElement;
  }

  return el.ownerDocument.body || el;
}

function computeUnitPx(root: HTMLElement): number {
  const anchor = findMeasurementAnchor(root);
  return (
    readUnitPx(anchor, 0)
    || readUnitPx(root, 0)
    || measureCssUnit(anchor, '--cnt-usz', 0, root)
    || measureCssUnit(root, '--cnt-usz', 0, anchor)
  );
}

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
    const unitPx = computeUnitPx(root);
    const gutter = 4;
    setDeclaredUnitState(root, {
      baseUnits: safeUnits,
      liveUnits: safeUnits,
      behavior: 'fixed',
    });

    if (unitPx > 0) {
      button.style.height = `${safeUnits * unitPx + (safeUnits - 1) * gutter}px`;
      return;
    }

    button.style.height = `calc(var(--cnt-usz) * ${safeUnits} + ${(safeUnits - 1) * gutter}px)`;
  };

  const setState = (state: ButtonShellState) => {
    if (state.pressed) root.dataset.buttonPressed = 'true';
    else delete root.dataset.buttonPressed;

    if (state.accentColor) button.style.setProperty('--tp-btn-accent', state.accentColor);
    else button.style.removeProperty('--tp-btn-accent');
  };

  setUnits(options.units);
  setState(options.state ?? {});

  return {
    root,
    button,
    contentHost,
    setUnits,
    setState,
  };
}
