import { normalizeSplitParams, type NormalizedSplitLayoutParams } from './split/params';
import { buildSplitLayout } from './split/layoutBuilder';
import { attachInteractiveGutters } from './split/interactiveGutters';

// Auto-tweak slider labels to prevent overflow and truncate long text
function installSliderLabelAutoTweak(
  container: HTMLElement,
  compactSliders: boolean = true,
  hideLabels: boolean = false,
): () => void {
  const observers: MutationObserver[] = [];
  const tweakedSet = new WeakSet<HTMLElement>();
  const tweakSliderLabel = (labeledView: HTMLElement) => {
    try {
      if (!labeledView.classList?.contains('tp-lblv')) return;
      if (tweakedSet.has(labeledView)) return; // Skip already tweaked
      const valueBox = labeledView.querySelector('.tp-lblv_v') as HTMLElement | null;
      if (!valueBox) return;
      const hasSlider = !!(valueBox.querySelector('.tp-sldv') || valueBox.querySelector('.tp-sldtxtv'));

      // Find label box (may not exist if already removed)
      const labelBox = labeledView.querySelector('.tp-lblv_l') as HTMLElement | null;

      // Since we cannot reliably know if label was passed, we don't modify labels here.

      // Mark as tweaked before modifying DOM
      tweakedSet.add(labeledView);

      // Apply slider scaling styles only if compactSliders is enabled and target has slider UI
      if (compactSliders && hasSlider) {
      const sldSurface = valueBox.querySelector('.tp-sldtxtv_s') as HTMLElement | null
        || valueBox.querySelector('.tp-sldv_s') as HTMLElement | null;
      if (sldSurface) {
        // Keep the slider visually anchored to the bottom; shrink height by 50%
        sldSurface.style.transformOrigin = 'bottom left';
        sldSurface.style.transform = 'scaleY(0.5)';
        (sldSurface.style as any).willChange = 'transform';
        // Hide a potential draggable handle/knob within the slider surface
        const handle = sldSurface.querySelector('.tp-sldv_h')
          || sldSurface.querySelector('[class*="sldv_h"]')
          || sldSurface.querySelector('[class*="knob"]')
          || sldSurface.querySelector('[class*="handle"]')
          || sldSurface.querySelector('[class*="thumb"]') as HTMLElement | null;
        if (handle) {
          (handle as HTMLElement).style.display = 'none';
        }
      }

      // Place the entire text area (.tp-sldtxtv_t) at the top-right, unscaled by slider surface
      const sldTextArea = valueBox.querySelector('.tp-sldtxtv_t') as HTMLElement | null;
      if (sldTextArea) {
        // Ensure value container is positioning root, then mount here
        try { valueBox.appendChild(sldTextArea); } catch {}
        sldTextArea.style.position = 'absolute';
        sldTextArea.style.right = '6px';
        sldTextArea.style.top = '2px';
        sldTextArea.style.transformOrigin = 'top right';
        sldTextArea.style.transform = 'scale(0.3333, 0.5)';
        (sldTextArea.style as any).willChange = 'transform';
        sldTextArea.style.zIndex = '1';
        // Enlarge numeric text for readability (pre-scale), and bold
        const inputEl = sldTextArea.querySelector('input') as HTMLElement | null;
        if (inputEl) {
          // Pre-scale font so post-scale ~12px (scaleY=0.5)
          inputEl.style.fontSize = '24px';
          inputEl.style.fontWeight = '';
          inputEl.style.lineHeight = '1';
          // Use Tweakpane default font (inherit)
          inputEl.style.fontFamily = '';
          inputEl.style.letterSpacing = '0.01em';
        }
      }
      }

      // Handle label if it exists
      // Overlay label only if it remains visible
      const labelStillVisible = !!(labelBox && (!hideLabels || (hideLabels && labelBox.isConnected)));
      if (labelBox && compactSliders && labelStillVisible && hasSlider) {
        // Move label into value box as overlay
        labelBox.style.position = 'absolute';
        labelBox.style.left = '6px';
        labelBox.style.top = '4px';
        labelBox.style.fontSize = '10px';
        labelBox.style.lineHeight = '1';
        labelBox.style.margin = '0';
        labelBox.style.padding = '0';
        // Limit width to 60% and truncate with ellipsis
        labelBox.style.maxWidth = '60%';
        labelBox.style.overflow = 'hidden';
        labelBox.style.textOverflow = 'ellipsis';
        labelBox.style.whiteSpace = 'nowrap';
        // Make background transparent and place behind slider
        labelBox.style.paddingRight = '4px';
        labelBox.style.background = 'transparent';
        labelBox.style.zIndex = '1';
        // Insert label into value box
        try { valueBox.insertBefore(labelBox, valueBox.firstChild); } catch {}
      }
    } catch {}
  };
  const patchAll = (root: HTMLElement) => {
    const labeled = root.querySelectorAll('.tp-lblv');
    labeled.forEach((lv) => tweakSliderLabel(lv as HTMLElement));
  };
  patchAll(container);
  const mo = new MutationObserver(() => patchAll(container));
  mo.observe(container, { childList: true, subtree: true });
  observers.push(mo);
  return () => { observers.forEach((o) => { try { o.disconnect(); } catch {} }); };
}

export type SplitDirection = 'row' | 'column';

export type SplitLayoutNode =
  | string // Any string represents a leaf category (e.g., 'leaf', 'audio', 'video', 'controls')
  | {
      view: 'split-layout';
      direction: SplitDirection;
      // Allow full SizeExpression for nested nodes to support presets like 'equal'
      sizes?: SizeExpression;
      // When direction === 'column', optional per-row heights in blade units.
      // If provided, overrides 'sizes' and computes container height from units.
      rowUnits?: SizeExpression;
      children: SplitLayoutNode[];
      minSize?: number; // min percentage for each pane (default 5)
      // Allow string for convenience (e.g., '6')
      gutter?: number | string; // gutter size in px (default 6)
      height?: number | string; // only meaningful when direction === 'column'
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
  // Vertical unit allocation for column layout (supports same expressions)
  rowUnits?: SizeExpression;
  // Optional fixed height for row layout
  height?: number | string;
  // Gutter size (default: 6px)
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
      installSliderLabelAutoTweak(container, params.compactSliders, false),
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
    this._dispose = built.cleanup;
    try { this.viewProps?.handleDispose?.(() => { try { built.cleanup(); } catch {} }); } catch {}
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

  // Wrap a Pane instance so that addBinding() hides label when not explicitly provided
  wrapPane<T extends { addBinding: Function }>(pane: T): T {
    const orig = (pane.addBinding as Function).bind(pane);
    (pane as any).addBinding = (obj: unknown, key: string, params?: Record<string, unknown>) => {
      const hasLabel = !!(params && Object.prototype.hasOwnProperty.call(params, 'label'));
      const labelEmpty = hasLabel && (params as any).label === '';
      const api = orig(obj, key, params);
      if (!hasLabel || labelEmpty) {
        try {
          const el = (api as any)?.controller?.view?.element as HTMLElement | undefined;
          const lbl = el?.querySelector('.tp-lblv_l') as HTMLElement | null;
          if (lbl) { lbl.remove(); el?.classList.add('tp-lblv-nol'); }
        } catch {}
      }
      return api;
    };
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
    .tp-split-root-column > .tp-split-panel.tp-split-panel {
      flex: 0 0 auto !important;
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

// Helper to mount split layout without formal plugin registration (shim-style)
export function addSplitLayout(hostApi: any, params: SplitLayoutParams) {
  const contentEl: HTMLElement | null = (hostApi?.controller?.view?.containerElement ?? null) as HTMLElement | null;
  const hostEl: HTMLElement = contentEl || (hostApi?.element as HTMLElement) || (hostApi?.controller?.view?.element as HTMLElement);
  if (!hostEl) throw new Error('addSplitLayout: invalid host API (no element)');

  const doc = (hostEl.ownerDocument || document) as Document;
  const norm = normalizeSplitParams(params as any);
  const built = mountSplitLayout(doc, norm, { envEl: hostEl });
  hostEl.appendChild(built.element);

  return {
    getSlots(): HTMLElement[] { return built.leaves.slice(); },
    dispose() { try { built.cleanup(); } catch {} try { hostEl.removeChild(built.element); } catch {} },
    element: built.element,
  };
}
