// Minimal split-layout Blade plugin for Tweakpane v4
// - Provides flexible row/column split with draggable gutters
// - Exposes leaf slots so callers can mount child Panes per slot
// - Keeps implementation self-contained; clean up listeners on dispose
//
// NOTE: We purposely keep typings light (any) to avoid coupling to
// Tweakpane's internal plugin types. External API is stable enough:
//   pane.registerPlugin(SplitLayoutPlugin)
//   const api = folder.addBlade({ view: 'split-layout', ... }) as any
//   const slots: HTMLElement[] = api.getSlots()

export type SplitDirection = 'row' | 'column';

export type SplitLayoutNode =
  | 'leaf'
  | {
      view: 'split-layout';
      direction: SplitDirection;
      sizes?: number[]; // percentages per child (sum ~100)
      children: SplitLayoutNode[];
      minSize?: number; // min percentage for each pane (default 5)
      gutter?: number; // gutter size in px (default 6)
      height?: number; // only meaningful when direction === 'column'
    };

export type SplitLayoutParams = {
  view: 'split-layout';
  direction: SplitDirection;
  sizes?: number[];
  children: SplitLayoutNode[];
  minSize?: number;
  gutter?: number;
  height?: number;
  // When true, show draggable gutters and enable pointer resize
  // Default false for static layout per project needs
  interactive?: boolean;
};

type BuildResult = {
  element: HTMLElement;
  leaves: HTMLElement[]; // in DFS order
  cleanup: () => void;
};

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
): BuildResult {
  const direction: SplitDirection = params.direction;
  const children = params.children;
  const n = children.length;
  const sizes = normalizeSizes(n, params.sizes);
  const minSize = params.minSize ?? 5;
  const gutter = params.gutter ?? 6;
  const interactive = !!params.interactive; // default static

  // Root container
  const root = doc.createElement('div');
  root.className = 'tp-split-root';
  root.style.display = 'flex';
  root.style.flexDirection = direction === 'row' ? 'row' : 'column';
  root.style.width = '100%';
  if (direction === 'column') {
    // Height is required for vertical split to make gutters meaningful
    root.style.height = (params.height ?? 160) + 'px';
  }
  // Subtle alignment with Tweakpane spacing
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
    // Use flex-basis with no grow/shrink to keep percentage layout predictable
    if (direction === 'row') {
      panel.style.flex = `0 0 ${sizes[i]}%`;
      panel.style.height = '100%';
    } else {
      panel.style.flex = `0 0 ${sizes[i]}%`;
      panel.style.width = '100%';
    }
    panel.style.minWidth = direction === 'row' ? '0' : '100%';
    panel.style.minHeight = direction === 'column' ? '0' : '100%';
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';

    // Content container inside panel to host nested layout or leaf
    const content = doc.createElement('div');
    content.className = 'tp-split-content';
    content.style.flex = '1 1 auto';
    content.style.minHeight = '0';
    content.style.minWidth = '0';
    panel.appendChild(content);

    panelWrappers.push(panel);
    root.appendChild(panel);
  }

  // Recursively populate content
  for (let i = 0; i < n; i++) {
    const child = children[i];
    const container = panelWrappers[i].firstElementChild as HTMLElement;
    if (child === 'leaf') {
      container.style.display = 'block';
      container.style.width = '100%';
      container.style.height = '100%';
      leaves.push(container);
      paneEls.push(container);
    } else if (child && (child as any).view === 'split-layout') {
      const res = buildSplit(doc, child as SplitLayoutParams, path.concat(i));
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
  if (interactive && panelWrappers.length > 1) {
    // Drag handling between adjacent panels
    const basis: number[] = sizes.slice();
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
        const total = a0 + b0;
        let a = a0;
        if (direction === 'row') {
          const dw = (dx / rect.width) * 100;
          a = clamp(a0 + dw, minSize, total - minSize);
        } else {
          const dh = (dy / rect.height) * 100;
          a = clamp(a0 + dh, minSize, total - minSize);
        }
        const b = total - a;
        basis[idx] = a;
        basis[idx + 1] = b;
        (panelWrappers[idx].style as any).flex = `0 0 ${a}%`;
        (panelWrappers[idx + 1].style as any).flex = `0 0 ${b}%`;
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
          const x = a.right - rrect.left + (b.left - a.right - gutter) / 2;
          handle.style.left = `${x}px`;
          handle.style.top = '0';
          handle.style.width = `${gutter}px`;
          handle.style.height = '100%';
        } else {
          const y = a.bottom - rrect.top + (b.top - a.bottom - gutter) / 2;
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
    const params: SplitLayoutParams = args.params;
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
};
