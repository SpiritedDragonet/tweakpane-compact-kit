// Minimal split-layout Blade plugin for Tweakpane v4
// - Provides flexible row/column split with draggable gutters
// - Exposes leaf slots so callers can mount child Panes per slot
// - Keeps implementation self-contained; clean up listeners on dispose
// - Auto-applies optimized styles for tight layout (no gaps)
// - Auto-tweaks slider labels to prevent overflow
//
// NOTE: We purposely keep typings light (any) to avoid coupling to
// Tweakpane's internal plugin types. External API is stable enough:
//   pane.registerPlugin(SplitLayoutPlugin)
//   const api = folder.addBlade({ view: 'split-layout', ... }) as any
//   const slots: HTMLElement[] = api.getSlots()

// Auto-tweak slider labels to prevent overflow and truncate long text
function installSliderLabelAutoTweak(container: HTMLElement): () => void {
  const observers: MutationObserver[] = [];
  const tweakSliderLabel = (labeledView: HTMLElement) => {
    try {
      if (!labeledView.classList?.contains('tp-lblv')) return;
      const valueBox = labeledView.querySelector('.tp-lblv_v') as HTMLElement | null;
      if (!valueBox) return;
      const hasSlider = !!(valueBox.querySelector('.tp-sldv') || valueBox.querySelector('.tp-sldtxtv'));
      if (!hasSlider) return;
      const labelBox = labeledView.querySelector('.tp-lblv_l') as HTMLElement | null;
      if (!labelBox) return;
      // Move label into value box as overlay
      labelBox.style.position = 'absolute';
      labelBox.style.left = '6px';
      labelBox.style.top = '4px';
      labelBox.style.fontSize = '10px';
      labelBox.style.lineHeight = '1';
      labelBox.style.color = '#aaa';
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
      // Ensure slider handle is above label
      const sliderHandle = labeledView.querySelector('.tp-txtv_k') as HTMLElement | null;
      if (sliderHandle) {
        sliderHandle.style.zIndex = '2';
        sliderHandle.style.position = 'relative';
      }
      try { valueBox.insertBefore(labelBox, valueBox.firstChild); } catch {}
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
  | 'leaf'
  | {
      view: 'split-layout';
      direction: SplitDirection;
      sizes?: number[]; // percentages per child (sum ~100)
      // When direction === 'column', optional per-row heights in blade units.
      // If provided, overrides 'sizes' and computes container height from units.
      rowUnits?: number[];
      children: SplitLayoutNode[];
      minSize?: number; // min percentage for each pane (default 5)
      gutter?: number; // gutter size in px (default 6)
      height?: number; // only meaningful when direction === 'column'
    };

export type SplitLayoutParams = {
  view: 'split-layout';
  direction: SplitDirection;
  sizes?: number[];
  rowUnits?: number[]; // only for direction === 'column'
  children: SplitLayoutNode[];
  minSize?: number;
  gutter?: number;
  height?: number;
  // When true, show draggable gutters and enable pointer resize
  // Default false for static layout per project needs
  interactive?: boolean;
  // Optional sugar for constructing sizes
  mode?: 'equal' | 'ratio';
  count?: number; // when mode==='equal'
  ratio?: number; // (0,1), when mode==='ratio'
};

type BuildResult = {
  element: HTMLElement;
  leaves: HTMLElement[]; // in DFS order
  cleanup: () => void;
};

function normalizeSplitParams(input: any): SplitLayoutParams {
  // Clone to avoid mutating caller object
  const p: any = { ...input };
  const dir: SplitDirection = p.direction === 'column' ? 'column' : 'row';
  const children: SplitLayoutNode[] = Array.isArray(p.children) ? p.children.slice() : [];
  const gutter = typeof p.gutter === 'number' ? p.gutter : 6;
  const interactive = !!p.interactive;
  const minSize = typeof p.minSize === 'number' ? p.minSize : undefined;
  const height = typeof p.height === 'number' ? p.height : undefined;

  if (p.mode === 'equal') {
    const cnt = Math.max(1, Math.floor(Number(p.count) || children.length || 1));
    // Ensure children length matches count
    if (children.length < cnt) {
      for (let i = children.length; i < cnt; i++) children.push('leaf');
    } else if (children.length > cnt) {
      children.length = cnt;
    }
    const sizes = Array.from({ length: cnt }, () => 100 / cnt);
    return { view: 'split-layout', direction: dir, sizes, children, gutter, interactive, minSize, height } as SplitLayoutParams;
  }
  if (p.mode === 'ratio') {
    let r = Number(p.ratio);
    if (!Number.isFinite(r)) r = 0.5;
    r = Math.min(0.9, Math.max(0.1, r));
    if (children.length < 2) {
      while (children.length < 2) children.push('leaf');
    } else if (children.length > 2) {
      children.length = 2;
    }
    const sizes = [r * 100, (1 - r) * 100];
    return { view: 'split-layout', direction: dir, sizes, children, gutter, interactive, minSize, height } as SplitLayoutParams;
  }
  // Default pass-through (support sizes/rowUnits forms)
  return { view: 'split-layout', direction: dir, sizes: p.sizes, rowUnits: p.rowUnits, children, gutter, interactive, minSize, height } as SplitLayoutParams;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function normalizeSizes(count: number, sizes?: number[]): number[] {
  if (!sizes || sizes.length !== count) {
    return Array.from({ length: count }, () => 100 / count);
  }
  const sum = sizes.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0) || 1;
  return sizes.map((s) => (Number.isFinite(s) ? (s / sum) * 100 : 0));
}

function buildSplit(
  doc: Document,
  params: SplitLayoutParams,
  path: number[] = [],
  envEl?: HTMLElement,
): BuildResult {
  const direction: SplitDirection = params.direction;
  const children = params.children;
  const n = children.length;
  let sizes = normalizeSizes(n, params.sizes);
  // Allow zero-width panels when dragging unless caller overrides
  const minSize = params.minSize ?? 0;
  // Enforce a 4px gutter to avoid overflow and keep visuals tight
  const gutter = 4;
  const interactive = !!params.interactive; // default static
  const rowUnits = (direction === 'column' && Array.isArray((params as any).rowUnits))
    ? ((params as any).rowUnits as number[])
    : undefined;
  const computeUnitPx = (fallbackEl: HTMLElement): number => {
    const anchor = envEl || fallbackEl || doc.body;
    const probe = doc.createElement('div');
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.height = 'var(--cnt-usz)';
    probe.style.width = '1px';
    try { anchor.appendChild(probe); } catch { try { fallbackEl.appendChild(probe); } catch {} }
    const px = probe.getBoundingClientRect().height || (probe as any).offsetHeight || 0;
    try { probe.remove(); } catch {}
    return Math.max(1, Math.round(px || 0));
  };

  // Root container
  const root = doc.createElement('div');
  root.className = 'tp-split-root';
  root.classList.add(direction === 'row' ? 'tp-split-root-row' : 'tp-split-root-column');
  root.style.display = 'flex';
  root.style.flexDirection = direction === 'row' ? 'row' : 'column';
  root.style.width = '100%';
  root.style.boxSizing = 'border-box';
  let unitPxForColumn: number | null = null;
  let currentUnits: number[] | null = null;
  if (direction === 'column') {
    // Height is required for vertical split to make gutters meaningful
    if (rowUnits && rowUnits.length === n) {
      unitPxForColumn = computeUnitPx(root);
      currentUnits = rowUnits.map((u) => Math.max(1, Math.floor(u || 0)));
      const totalUnits = currentUnits.reduce((a, b) => a + b, 0) || n;
      sizes = currentUnits.map((u) => (u / totalUnits) * 100);
      const gapPx = (n > 1 ? (n - 1) * gutter : 0);
      const hPx = totalUnits * unitPxForColumn + gapPx;
      root.style.height = `${hPx}px`;
    } else {
      root.style.height = (params.height ?? 160) + 'px';
    }
  }
  // Controlled spacing between panes; flex-gap aware sizing below avoids overflow
  root.style.gap = gutter + 'px';

  // Track panel elements and disposers
  const paneEls: HTMLElement[] = [];
  const disposers: Array<() => void> = [];
  const leaves: HTMLElement[] = [];

  // Create panels
  const panelWrappers: HTMLElement[] = [];
  for (let i = 0; i < n; i++) {
    const panel = doc.createElement('div');
    panel.className = 'tp-split-panel';
    // Flex sizing: for row/column-percentage we use grow weights with 0 basis
    // so the gap is excluded from distributable space. For column+rowUnits we use px basis.
    if (direction === 'row') {
      panel.style.flexGrow = String(Math.max(0.0001, sizes[i]));
      panel.style.flexShrink = '0';
      panel.style.flexBasis = '0px';
      panel.style.height = '100%';
    } else {
      if (rowUnits && rowUnits.length === n) {
        const units = Math.max(1, Math.floor((currentUnits ? currentUnits[i] : rowUnits[i]) || 0));
        (panel.style as any).flex = `0 0 ${units * (unitPxForColumn || computeUnitPx(root))}px`;
      } else {
        panel.style.flexGrow = String(Math.max(0.0001, sizes[i]));
        panel.style.flexShrink = '0';
        panel.style.flexBasis = '0px';
      }
      panel.style.width = '100%';
    }
    panel.style.minWidth = direction === 'row' ? '0' : '100%';
    panel.style.minHeight = direction === 'column' ? '0' : '100%';
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    panel.style.boxSizing = 'border-box';

    // Content container inside panel to host nested layout or leaf
    const content = doc.createElement('div');
    content.className = 'tp-split-content';
    content.style.flex = '1 1 auto';
    content.style.minHeight = '0';
    content.style.minWidth = '0';
    content.style.boxSizing = 'border-box';
    panel.appendChild(content);

    panelWrappers.push(panel);
    root.appendChild(panel);
  }

  // Recursively populate content
  for (let i = 0; i < n; i++) {
    const child = children[i];
    const container = panelWrappers[i].firstElementChild as HTMLElement;
    if (child === 'leaf') {
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'stretch';
      container.style.width = '100%';
      container.style.height = 'auto';
      container.style.minHeight = '0';
      container.classList.add('tp-split-leaf');
      container.style.boxSizing = 'border-box';
      // Debug frame to visualize leaf bounds during development
      container.style.outline = '1px dashed #444';
      container.style.outlineOffset = '0px';
      try { (container.dataset as any).splitPath = path.concat(i).join('.'); } catch {}
      leaves.push(container);
      paneEls.push(container);
      // Auto-apply slider label tweaks for this leaf
      try {
        const cleanupSlider = installSliderLabelAutoTweak(container);
        disposers.push(cleanupSlider);
      } catch {}
      // Live adjust height when content changes for column+rowUnits mode
      if (direction === 'column' && rowUnits && rowUnits.length === n) {
        try {
          const ro = new ResizeObserver(() => {
            try {
              const unitPx = unitPxForColumn || computeUnitPx(root);
              // Measure natural content height; include folder header if present
              const folder = container.querySelector('.tp-fldv') as HTMLElement | null;
              let h = 0;
              if (folder) {
                const hdr = folder.querySelector('.tp-fldv_b') as HTMLElement | null;
                const cnt = folder.querySelector('.tp-fldv_c') as HTMLElement | null;
                const relax = (t: HTMLElement | null): number => {
                  if (!t) return 0;
                  const ph = t.style.height;
                  const pf = t.style.flex as string;
                  // Only relax when the element doesn't have explicit height
                  const hasExplicit = !!(ph && ph !== 'auto');
                  if (!hasExplicit) {
                    try { t.style.height = 'auto'; t.style.flex = '0 0 auto'; } catch {}
                  }
                  const sh = (t as any).scrollHeight || 0;
                  const rh = t.getBoundingClientRect().height || 0;
                  const hh = Math.max(sh, rh);
                  if (!hasExplicit) {
                    try { t.style.height = ph; t.style.flex = pf; } catch {}
                  }
                  return hh;
                };
                h = relax(hdr) + relax(cnt);
              } else {
                // Prefer measuring an intrinsic-height subtree to avoid feedback from 100%-height styles
                const intrinsic = (container.querySelector('.tp-rotv_c') as HTMLElement | null)
                  || (container.firstElementChild as HTMLElement | null)
                  || container;
                const prevH = intrinsic.style.height;
                const prevFlex = intrinsic.style.flex;
                const hasExplicit = !!(prevH && prevH !== 'auto');
                const isDomLeaf = intrinsic.classList?.contains('tp-demo-domleaf');
                if (!hasExplicit && !isDomLeaf) {
                  try { intrinsic.style.height = 'auto'; intrinsic.style.flex = '0 0 auto'; } catch {}
                }
                const scrH = (intrinsic as any).scrollHeight || 0;
                const rectH = intrinsic.getBoundingClientRect().height || 0;
                h = Math.max(scrH, rectH);
                if (!hasExplicit && !isDomLeaf) {
                  try { intrinsic.style.height = prevH; intrinsic.style.flex = prevFlex; } catch {}
                }
              }
              const MAX_UNITS = 64;
              const need = Math.max(1, Math.min(MAX_UNITS, Math.ceil(h / unitPx)));
              if (currentUnits && need !== currentUnits[i]) {
                currentUnits[i] = need;
                (panelWrappers[i].style as any).flex = `0 0 ${need * unitPx}px`;
                // Recompute container height
                const totalU = currentUnits.reduce((a, b) => a + b, 0) || n;
                const gapPx = (n > 1 ? (n - 1) * gutter : 0);
                const hPx = totalU * unitPx + gapPx;
                root.style.height = `${hPx}px`;
                try { (root as any).__split_refreshHandles?.(); } catch {}
              }
            } catch {}
          });
          ro.observe(container);
          disposers.push(() => { try { ro.disconnect(); } catch {} });
        } catch {}
      }
    } else if (child && (child as any).view === 'split-layout') {
      const res = buildSplit(doc, child as SplitLayoutParams, path.concat(i), envEl);
      container.appendChild(res.element);
      leaves.push(...res.leaves);
      disposers.push(res.cleanup);
    } else {
      // Fallback to a leaf if malformed
      container.style.display = 'block';
      container.style.width = '100%';
      container.style.height = '100%';
      leaves.push(container);
    }
  }

  // Optional interactive gutters. Disabled by default.
  let cleanupHandles = () => {};
  let refreshHandles: () => void = () => {};
  (root as any).__split_refreshHandles = refreshHandles;
  if (interactive && panelWrappers.length > 1) {
    // Drag handling between adjacent panels
    const basis: number[] = (direction === 'column' && rowUnits && rowUnits.length === n)
      ? rowUnits.map((u) => Math.max(1, Math.floor(u || 0)))
      : sizes.slice();
    const onPointerDown = (ev: PointerEvent, idx: number) => {
      if (!(ev.target instanceof HTMLElement)) return;
      const rect = root.getBoundingClientRect();
      const startX = ev.clientX;
      const startY = ev.clientY;
      const a0 = basis[idx];
      const b0 = basis[idx + 1];
      const move = (e: PointerEvent) => {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (direction === 'column' && rowUnits && rowUnits.length === n) {
          // units-based vertical split: snap to integer blade units
          const unitPx = computeUnitPx(root);
          const totalUnits = a0 + b0;
          const deltaUnits = Math.round(dy / unitPx);
          const aUnits = clamp(a0 + deltaUnits, 1, totalUnits - 1);
          const bUnits = totalUnits - aUnits;
          basis[idx] = aUnits;
          basis[idx + 1] = bUnits;
          (panelWrappers[idx].style as any).flex = `0 0 ${aUnits * unitPx}px`;
          (panelWrappers[idx + 1].style as any).flex = `0 0 ${bUnits * unitPx}px`;
        } else {
          // percentage-based via flex-grow weights
          const total = a0 + b0;
          let a = a0;
          if (direction === 'row') {
            const dw = (dx / rect.width) * total;
            a = clamp(a0 + dw, minSize, total - minSize);
          } else {
            const dh = (dy / rect.height) * total;
            a = clamp(a0 + dh, minSize, total - minSize);
          }
          const b = total - a;
          basis[idx] = a;
          basis[idx + 1] = b;
          panelWrappers[idx].style.flexGrow = String(a);
          panelWrappers[idx].style.flexShrink = '0';
          panelWrappers[idx].style.flexBasis = '0px';
          panelWrappers[idx + 1].style.flexGrow = String(b);
          panelWrappers[idx + 1].style.flexShrink = '0';
          panelWrappers[idx + 1].style.flexBasis = '0px';
        }
      };
      const up = () => {
        doc.removeEventListener('pointermove', move as any);
        doc.removeEventListener('pointerup', up as any);
      };
      doc.addEventListener('pointermove', move as any);
      doc.addEventListener('pointerup', up as any, { once: true });
    };

    const handles: HTMLElement[] = [];
    const refreshHandlePositions = () => {
      if (getComputedStyle(root).position === 'static') root.style.position = 'relative';
      handles.forEach((h) => h.remove());
      handles.length = 0;
      const rrect = root.getBoundingClientRect();
      for (let i = 0; i < panelWrappers.length - 1; i++) {
        const a = panelWrappers[i].getBoundingClientRect();
        const b = panelWrappers[i + 1].getBoundingClientRect();
        const handle = doc.createElement('div');
        handle.className = 'tp-split-gutter';
        handle.style.position = 'absolute';
        handle.style.background = 'transparent';
        handle.style.cursor = direction === 'row' ? 'col-resize' : 'row-resize';
        if (direction === 'row') {
          const x = a.right - rrect.left; // cover the full gap horizontally
          handle.style.left = `${x}px`;
          handle.style.top = '0';
          handle.style.width = `${gutter}px`;
          handle.style.height = '100%';
        } else {
          const y = a.bottom - rrect.top; // cover the full gap vertically
          handle.style.left = '0';
          handle.style.top = `${y}px`;
          handle.style.width = '100%';
          handle.style.height = `${gutter}px`;
        }
        handle.addEventListener('pointerdown', (e) => onPointerDown(e as PointerEvent, i));
        root.appendChild(handle);
        handles.push(handle);
      }
    };
    const ro = new ResizeObserver(() => refreshHandlePositions());
    ro.observe(root);
    setTimeout(refreshHandlePositions, 0);
    cleanupHandles = () => {
      ro.disconnect();
      handles.forEach((h) => h.remove());
    };
    refreshHandles = refreshHandlePositions;
    (root as any).__split_refreshHandles = refreshHandlePositions;
  }

  const cleanup = () => {
    cleanupHandles();
    disposers.forEach((d) => d());
  };

  return { element: root, leaves, cleanup };
}

class SplitLayoutController {
  public view: { element: HTMLElement };
  public slots: HTMLElement[];
  private _dispose: () => void;
  constructor(args: any) {
    const doc: Document = args.document ?? document;
    const params: SplitLayoutParams = normalizeSplitParams(args.params);
    const built = buildSplit(doc, params);
    this.view = { element: built.element };
    this.slots = built.leaves;
    this._dispose = built.cleanup;
  }
  dispose() {
    this._dispose?.();
  }
}

class SplitLayoutApi {
  private _c: SplitLayoutController;
  constructor(controller: SplitLayoutController) {
    this._c = controller;
  }
  getSlots(): HTMLElement[] {
    return this._c.slots;
  }
}

export const SplitLayoutPlugin: any = {
  id: 'split-layout',
  // Mark as blade plugin so it can be added via addBlade({ view: 'split-layout' })
  type: 'blade',
  accept(params: any) {
    if (!params || params.view !== 'split-layout') return null;
    return { params };
  },
  controller(args: any) {
    return new SplitLayoutController(args);
  },
  // Expose a simple API to retrieve leaf slots so callers can mount UIs
  api(args: any) {
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
  const built = buildSplit(doc, norm, [], hostEl);
  hostEl.appendChild(built.element);

  return {
    getSlots(): HTMLElement[] { return built.leaves.slice(); },
    dispose() { try { built.cleanup(); } catch {} try { hostEl.removeChild(built.element); } catch {} },
    element: built.element,
  };
}
