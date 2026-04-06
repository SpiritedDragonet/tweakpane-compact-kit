import { normalizeSplitParams, type NormalizedSplitLayoutParams } from './split/params';
import { buildSplitLayout } from './split/layoutBuilder';
import { attachInteractiveGutters } from './split/interactiveGutters';
import { installCompactSliderPatch } from './hacks/compactSliderPatch';
import { bindBladePositionClasses } from './shared/bladePositionClasses';
import { setSplitRootHorizontalInset } from './split/rootInset';

export type SplitDirection = 'row' | 'column';

export type SplitLayoutNode =
  | string // Any string represents a leaf category (e.g., 'leaf', 'audio', 'video', 'controls')
  | {
      view: 'split-layout';
      direction: SplitDirection;
      // Allow full SizeExpression for nested nodes to support presets like 'equal'
      sizes?: SizeExpression;
      // Baseline vertical span for this node. Adaptive content may exceed it.
      units?: number;
      children: SplitLayoutNode[];
      minSize?: number; // min percentage for each pane (default 5)
      // Allow string for convenience (e.g., '6')
      gutter?: number | string; // gutter size in px (default 4)
      interactive?: boolean;
      compactSliders?: boolean;
    };

// Size expressions - keep only the actually used formats
export type SizeExpression =
  | number[]    // [66, 34] or [1, 2, 1] - normalized ratios
  | string;     // '1fr 2fr' or 'equal'

export type SplitLayoutParams = {
  view: 'split-layout';
  direction: SplitDirection;
  // Size expression: number[] like [66, 34] or string like '1fr 2fr' or 'equal'
  sizes?: SizeExpression;
  // Children - inferred from sizes if not provided
  children?: SplitLayoutNode[];
  // Baseline vertical span for this split root.
  units?: number;
  // Gutter size (default: 4px)
  gutter?: number | string;
  // Minimum size for each panel (default: 20)
  minSize?: number;
  // Enable interactive resizing
  interactive?: boolean;
  // Apply compact slider styles (default: true)
  compactSliders?: boolean;
};

type MountedSplitLayout = {
  element: HTMLElement;
  leaves: HTMLElement[];
  cleanup: () => void;
};

function mountSplitLayout(
  doc: Document,
  params: NormalizedSplitLayoutParams,
  options: { path?: number[]; envEl?: HTMLElement } = {},
): MountedSplitLayout {
  const built = buildSplitLayout(doc, params, {
    ...options,
    installLeafPatch: (container) =>
      installCompactSliderPatch(container, {
        enabled: params.compactSliders,
        hideLabels: false,
      }),
  });

  let cleanupGutters = () => {};
  if (params.interactive && built.panelWrappers.length > 1) {
    const gutters = attachInteractiveGutters({
      doc,
      root: built.element,
      panelWrappers: built.panelWrappers,
      direction: built.direction,
      sizes: built.sizes,
      currentUnits: built.currentUnits,
      computeUnitPx: built.computeUnitPx,
      minSize: built.minSize,
      gutter: built.gutter,
    });
    built.setRefreshHandles(gutters.refresh);
    cleanupGutters = gutters.cleanup;
  }

  return {
    element: built.element,
    leaves: built.leaves,
    cleanup: () => {
      cleanupGutters();
      built.cleanup();
    },
  };
}

class SplitLayoutController {
  public view: { element: HTMLElement };
  public blade: any;
  public viewProps: any;
  public slots: HTMLElement[];
  private _dispose: () => void;
  constructor(args: any) {
    const doc: Document = args.document ?? document;
    const params: NormalizedSplitLayoutParams = normalizeSplitParams(args.params);
    const built = mountSplitLayout(doc, params);
    this.view = { element: built.element };
    this.blade = args.blade;
    this.viewProps = args.viewProps;
    this.slots = built.leaves;
    const cleanupPositionClasses = bindBladePositionClasses(this.blade, built.element);
    this._dispose = () => {
      cleanupPositionClasses();
      built.cleanup();
    };
    try { this.viewProps?.bindClassModifiers?.(built.element); } catch {}
    try { this.viewProps?.handleDispose?.(() => { try { this._dispose(); } catch {} }); } catch {}
  }
  dispose() {
    this._dispose?.();
  }
}

class SplitLayoutApi {
  public controller: any;
  private _c: SplitLayoutController;
  constructor(controller: SplitLayoutController) {
    this._c = controller;
    this.controller = controller as any;
  }
  getSlots(): HTMLElement[] {
    return this._c.slots;
  }
  // Get slots by category (user-defined leaf types)
  getSlotsByCategory(category: string): HTMLElement[] {
    return this._c.slots.filter(slot =>
      slot.dataset && slot.dataset.leafCategory === category
    );
  }
  // Get all unique categories
  getCategories(): string[] {
    const categories = new Set<string>();
    this._c.slots.forEach(slot => {
      if (slot.dataset && slot.dataset.leafCategory) {
        categories.add(slot.dataset.leafCategory);
      }
    });
    return Array.from(categories);
  }
  // Get slots as a map of category -> slots[]
  getSlotsByCategoryMap(): Map<string, HTMLElement[]> {
    const map = new Map<string, HTMLElement[]>();
    this._c.slots.forEach(slot => {
      const category = slot.dataset?.leafCategory || 'leaf';
      if (!map.has(category)) {
        map.set(category, []);
      }
      map.get(category)!.push(slot);
    });
    return map;
  }

  // Wrap a Pane instance so split leaves can normalize hidden-label full-width controls.
  wrapPane<T extends { addBinding: Function }>(pane: T): T {
    const normalizeNoLabelRoots = (api: any, options?: { hideLabel?: boolean }) => {
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
    };

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

    return pane;
  }
}

// NOTE: The 'core' semver here refers to @tweakpane/core's major version.
// For Tweakpane v4.x, @tweakpane/core's major is 2.

export const SplitLayoutPlugin: any = {
  id: 'split-layout',
  // Mark as blade plugin so it can be added via addBlade({ view: 'split-layout' })
  type: 'blade',
  // Tweakpane compatibility: match @tweakpane/core major version (v2 for Tweakpane v4)
  core: { major: 2, minor: 0, patch: 0 },
  accept(params: any) {
    if (!params || params.view !== 'split-layout') return null;
    return { params };
  },
  controller(args: any) {
    return new SplitLayoutController(args);
  },
  // Expose a simple API to retrieve leaf slots so callers can mount UIs
  api(args: any) {
    if (!(args.controller instanceof SplitLayoutController)) return null;
    return new SplitLayoutApi(args.controller as SplitLayoutController);
  },
  // Auto-inject styles for tight layout (no gaps, no overflow)
  css: `
    /* Hide Tweakpane title bar and spacing elements to eliminate vertical gaps */
    .tp-split-leaf .tp-rotv_b {
      display: none !important;
      height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .tp-split-leaf .tp-rotv_i {
      display: none !important;
      height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    /* Make all containers shrink to content height */
    .tp-split-leaf.tp-split-leaf.tp-split-leaf {
      height: auto !important;
    }
    .tp-split-leaf .tp-rotv.tp-rotv.tp-rotv {
      height: auto !important;
      border-radius: 0 !important;
      border-top-left-radius: 0 !important;
      border-top-right-radius: 0 !important;
      border-bottom-left-radius: 0 !important;
      border-bottom-right-radius: 0 !important;
      padding: 0 !important;
      margin: 0 !important;
    }
    .tp-split-leaf .tp-rotv_c.tp-rotv_c.tp-rotv_c {
      flex: 0 0 auto !important;
      height: auto !important;
      padding: 0 !important;
      margin: 0 !important;
      gap: 0 !important;
    }

    /* Remove bottom margins/paddings to eliminate gaps */
    .tp-split-leaf .tp-lblv, .tp-split-leaf .tp-lblv_v { margin-bottom: 0 !important; }
    .tp-split-leaf .tp-v-fst, .tp-split-leaf .tp-v-vfst, .tp-split-leaf .tp-v-lst, .tp-split-leaf .tp-v-vlst {
      padding-bottom: 0 !important;
      margin-bottom: 0 !important;
    }
    .tp-split-leaf .tp-rotv_c > * { margin-bottom: 0 !important; }

    /* Fix all control layouts - prevent value containers from overflowing parent */
    .tp-split-leaf .tp-lblv {
      width: 100% !important;
      max-width: 100% !important;
      box-sizing: border-box !important;
      position: relative !important;
    }
    .tp-split-leaf .tp-lblv_v {
      width: auto !important;
      max-width: 100% !important;
      min-width: 0 !important;
      flex-shrink: 1 !important;
      box-sizing: border-box !important;
    }
    /* Exception for slider value containers */
    .tp-split-leaf .tp-lblv:has(.tp-sldv) .tp-lblv_v,
    .tp-split-leaf .tp-lblv:has(.tp-sldtxtv) .tp-lblv_v {
      width: 100% !important;
      max-width: 100% !important;
      position: relative !important;
    }
    .tp-split-leaf .tp-lblv_l {
      flex-basis: 30% !important;
      min-width: 0 !important;
      width: auto !important;
      box-sizing: border-box !important;
    }
  `,
};

