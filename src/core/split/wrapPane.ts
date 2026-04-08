/**
 * Wraps a nested Pane instance so its controls behave naturally inside split
 * leaves.
 *
 * Native Tweakpane rows assume their own label padding and root inset. Inside a
 * split leaf we normalize those assumptions away so full-width controls line up
 * with the split geometry instead of double-indenting.
 */
import { setSplitRootHorizontalInset } from './rootInset';

const WRAPPED_PANE_MARKER = '__tpSplitPaneWrapped';

/**
 * Removes hidden-label padding from wrapped rows and, when requested, strips
 * the label node entirely.
 */
function normalizeNoLabelRoots(api: any, options?: { hideLabel?: boolean }) {
  try {
    const el = api?.controller?.view?.element as HTMLElement | undefined;
    if (!el) return api;

    const labeledRoots = el.classList.contains('tp-lblv')
      ? [el]
      : Array.from(el.querySelectorAll('.tp-lblv')) as HTMLElement[];

    if (options?.hideLabel) {
      labeledRoots.forEach((root) => {
        const label = root.querySelector('.tp-lblv_l') as HTMLElement | null;
        if (label) {
          label.remove();
        }
        root.classList.add('tp-lblv-nol');
      });
    }

    const noLabelRoots = labeledRoots.filter((root) => root.classList.contains('tp-lblv-nol'));
    noLabelRoots.forEach((root) => {
      root.style.paddingLeft = '0px';
      root.style.paddingRight = '0px';
    });
  } catch {}
  return api;
}

/**
 * Patches the small subset of Pane methods that can inject full-width content
 * into split leaves.
 */
export function wrapSplitPane<T extends { addBinding: Function }>(pane: T): T {
  if ((pane as any)[WRAPPED_PANE_MARKER]) {
    return pane;
  }
  (pane as any)[WRAPPED_PANE_MARKER] = true;

  const origBinding = (pane.addBinding as Function).bind(pane);
  (pane as any).addBinding = (obj: unknown, key: string, params?: Record<string, unknown>) => {
    const hasLabel = !!(params && Object.prototype.hasOwnProperty.call(params, 'label'));
    const labelEmpty = hasLabel && (params as any).label === '';
    const api = origBinding(obj, key, params);
    return normalizeNoLabelRoots(api, {
      hideLabel: !hasLabel || labelEmpty,
    });
  };

  if (typeof (pane as any).addButton === 'function') {
    const origButton = (pane as any).addButton.bind(pane);
    (pane as any).addButton = (params?: Record<string, unknown>) => {
      const api = origButton(params);
      return normalizeNoLabelRoots(api);
    };
  }

  if (typeof (pane as any).addBlade === 'function') {
    const origBlade = (pane as any).addBlade.bind(pane);
    (pane as any).addBlade = (params?: Record<string, unknown>) => {
      const api = origBlade(params);
      normalizeNoLabelRoots(api);
      if (params?.view === 'split-layout') {
        try {
          const el = api?.controller?.view?.element as HTMLElement | undefined;
          if (el?.classList.contains('tp-split-root')) {
            setSplitRootHorizontalInset(el, false);
          }
        } catch {}
      }
      return api;
    };
  }

  if (typeof (pane as any).addFolder === 'function') {
    const origFolder = (pane as any).addFolder.bind(pane);
    (pane as any).addFolder = (params?: Record<string, unknown>) => {
      const api = origFolder(params);
      return wrapSplitPane(api);
    };
  }

  return pane;
}
