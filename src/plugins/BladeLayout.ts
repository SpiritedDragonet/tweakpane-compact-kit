// A lightweight, non-Tweakpane-plugin helper to build a blade-aligned
// 2D layout (rows x columns) using CSS Grid and return leaf slots.
//
// Design goals:
// - All row heights are integer multiples of Tweakpane unit height (1u = var(--cnt-usz)).
// - Columns are either equal split (n columns) or ratio split (two columns by ratio).
// - Supports nesting by embedding another BladeLayoutSpec in a child.
// - No drag/resize, no measurements here; caller decides units and structure.
// - Returns slots (HTMLElements) for callers to mount sub Panes.
//
// This keeps the demo simple and robust without reaching into Tweakpane internals.

export type BladeUnit = number | { value: number; unit: 'px' | 'blade' };

export type ColSplit =
  | { mode: 'equal'; count: number }
  | { mode: 'ratio'; ratio: number };

export type LayoutNode =
  | 'leaf'
  | { layout: BladeLayoutSpec };

export type RowSpec = {
  // Height in blade units (integer). No 'auto' here to keep the helper deterministic.
  units: number;
  cols: ColSplit;
  children: LayoutNode[]; // Must match column count (equal) or 2 (ratio)
};

export type SizingOptions = {
  // Growth policy:
  // - container: when 'grow', total height becomes the sum of (possibly grown) row units
  // - row: 'grow' makes each row expand to fit its tallest column content (snapped to integer units)
  //        'scroll' keeps row height fixed and enables overflow:auto on cells
  //        'fixed' keeps row height fixed and clips overflow
  // - snap: rounding policy when converting px -> units (default 'ceil')
  container?: 'fixed' | 'grow';
  row?: 'scroll' | 'fixed' | 'grow';
  snap?: 'ceil' | 'round';
};

export type BladeLayoutSpec = {
  // Total height in blade units. If omitted, sum of row units is used.
  units?: number;
  rows: RowSpec[];
  gutter?: {
    row?: BladeUnit;
    col?: BladeUnit;
  };
  sizing?: SizingOptions;
  className?: string;
};

export type BladeLayoutInstance = {
  root: HTMLElement;
  slots: HTMLElement[];
  refresh(): void;
  dispose(): void;
};

function toCssSize(u: BladeUnit | undefined, fallbackPx: string): string {
  if (u === undefined) return fallbackPx;
  if (typeof u === 'number') return `${u}px`;
  if (u.unit === 'px') return `${u.value}px`;
  // blade units
  return `calc(var(--cnt-usz) * ${u.value})`;
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`[BladeLayout] ${msg}`);
}

function repeat(n: number, v: string): string {
  return Array.from({ length: n }, () => v).join(' ');
}

function buildColumnsStyle(split: ColSplit): string {
  if (split.mode === 'equal') {
    assert(Number.isInteger(split.count) && split.count > 0, 'cols.equal.count must be positive integer');
    return `repeat(${split.count}, 1fr)`;
  }
  // ratio
  const r = split.ratio;
  assert(typeof r === 'number' && r > 0 && r < 1, 'cols.ratio.ratio must be in (0,1)');
  return `${r}fr ${1 - r}fr`;
}

function expectedChildCount(split: ColSplit): number {
  return split.mode === 'equal' ? split.count : 2;
}

function ensureIntUnits(u: number, ctx: string) {
  assert(Number.isInteger(u) && u > 0, `${ctx} must be a positive integer`);
}

export function mountBladeLayout(opts: {
  container: HTMLElement;
  spec: BladeLayoutSpec;
}): BladeLayoutInstance {
  const { container, spec } = opts;
  const root = container.ownerDocument.createElement('div');
  if (spec.className) root.className = spec.className;
  root.classList.add('tp-bladelayout');
  root.style.display = 'grid';
  root.style.width = '100%';
  root.style.boxSizing = 'border-box';

  // Validate rows and units
  assert(Array.isArray(spec.rows) && spec.rows.length > 0, 'rows must be non-empty');
  let sumUnits = 0;
  for (let i = 0; i < spec.rows.length; i++) {
    ensureIntUnits(spec.rows[i].units, `rows[${i}].units`);
    sumUnits += spec.rows[i].units;
    const need = expectedChildCount(spec.rows[i].cols);
    assert(spec.rows[i].children.length === need, `rows[${i}].children length must be ${need}`);
  }
  const totalUnits = spec.units ?? sumUnits;
  ensureIntUnits(totalUnits, 'spec.units');
  assert(sumUnits === totalUnits, `sum of row units (${sumUnits}) must equal spec.units (${totalUnits})`);

  // Gaps
  const rowGap = toCssSize(spec.gutter?.row, '0px');
  const colGap = toCssSize(spec.gutter?.col, '0px');
  (root.style as any).rowGap = rowGap;
  (root.style as any).columnGap = colGap;
  // Height is applied in refresh() using pixel units

  // Create row wrappers and collect cell containers for each row
  const rowElems: HTMLElement[] = [];
  const rowCells: HTMLElement[][] = [];
  const baseRowUnits: number[] = spec.rows.map((r) => r.units);
  for (let i = 0; i < spec.rows.length; i++) {
    const rowEl = container.ownerDocument.createElement('div');
    rowEl.style.gridColumn = '1 / -1';
    rowEl.style.gridRow = `${i + 1} / ${i + 2}`;
    // Each row is a grid for its columns
    rowEl.style.display = 'grid';
    rowEl.style.gridTemplateColumns = buildColumnsStyle(spec.rows[i].cols);
    (rowEl.style as any).columnGap = colGap;
    rowEl.classList.add('tp-bl-row');
    rowElems.push(rowEl);
    rowCells.push([]);
    root.appendChild(rowEl);
  }

  const slots: HTMLElement[] = [];

  // Recursively build children
  const childLayouts: BladeLayoutInstance[] = [];
  function mountChild(parent: HTMLElement, node: LayoutNode): void {
    if (node === 'leaf') {
      const slot = parent.ownerDocument.createElement('div');
      slot.style.width = '100%';
      // Use auto height so slot can reflect natural content height for measurement
      slot.style.height = 'auto';
      slot.classList.add('tp-bl-slot');
      parent.appendChild(slot);
      slots.push(slot);
      return;
    }
    // Nested layout
    const wrap = parent.ownerDocument.createElement('div');
    wrap.style.width = '100%';
    wrap.style.height = '100%';
    parent.appendChild(wrap);
    const child = mountBladeLayout({ container: wrap, spec: node.layout });
    // Merge slots depth-first
    child.slots.forEach((s) => slots.push(s));
    childLayouts.push(child);
  }

  // Fill each row with its columns/children
  for (let i = 0; i < spec.rows.length; i++) {
    const row = spec.rows[i];
    const rowEl = rowElems[i];
    const colsCount = expectedChildCount(row.cols);
    for (let c = 0; c < colsCount; c++) {
      const cell = rowEl.ownerDocument.createElement('div');
      // Use grid auto-placement
      cell.style.minWidth = '0';
      cell.style.minHeight = '0';
      cell.style.overflow = 'hidden'; // prevent content from overlapping neighboring cells
      cell.style.boxSizing = 'border-box';
      rowEl.appendChild(cell);
      rowCells[i].push(cell);
      mountChild(cell, row.children[c]);
    }
  }

  container.appendChild(root);
  // Listen for CSS transition end (e.g., folder open/close animations)
  try { root.addEventListener('transitionend', scheduleRefresh as any, true); } catch {}

  function computeUnitPx(doc: Document): number {
    const probe = doc.createElement('div');
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.height = 'var(--cnt-usz)';
    probe.style.width = '1px';
    root.appendChild(probe);
    const px = probe.getBoundingClientRect().height || probe.offsetHeight || 0;
    root.removeChild(probe);
    return Math.max(1, Math.round(px));
  }

  let rafPending = false;
  function scheduleRefresh() {
    if (rafPending) return;
    rafPending = true;
    (root.ownerDocument?.defaultView || window).requestAnimationFrame(() => {
      rafPending = false;
      refresh();
    });
  }

  function refresh() {
    const sizing = spec.sizing ?? {};
    const rowPolicy = sizing.row ?? 'grow';
    const containerPolicy = sizing.container ?? 'grow';
    const snap = sizing.snap ?? 'ceil';
    // Refresh nested layouts first to let them compute their size
    childLayouts.forEach((cl) => { try { cl.refresh?.(); } catch {} });

    const unitPx = computeUnitPx(root.ownerDocument || document);
    // Helper: choose a meaningful inner element to measure natural content height.
    const pickMeasurable = (cell: HTMLElement): HTMLElement => {
      // 1) Prefer nested BladeLayout root if present (represents column sum-of-rows)
      const nestedRoot = cell.querySelector('.tp-bladelayout') as HTMLElement | null;
      if (nestedRoot) return nestedRoot;
      // 2) Prefer Tweakpane pane root to include official paddings/margins
      const tpRoot = cell.querySelector('.tp-rotv') as HTMLElement | null;
      if (tpRoot) return tpRoot;
      // 3) Else prefer Tweakpane content box (single leaf)
      const tpContent = cell.querySelector('.tp-rotv_c') as HTMLElement | null;
      if (tpContent) return tpContent;
      // 4) Else fallback to immediate child or the cell itself
      const first = cell.firstElementChild as HTMLElement | null;
      if (first) return first;
      return cell;
    };
    const rowHeightsUnits: number[] = [];
    for (let i = 0; i < rowElems.length; i++) {
      const allocated = baseRowUnits[i];
      let neededPx = 0;
      const cells = rowCells[i];
      // enable scroll for 'scroll' policy
      const enableScroll = rowPolicy === 'scroll';
      cells.forEach((cell) => {
        // Measure natural content height of pane content; this reacts to folder expand/collapse
        const content = pickMeasurable(cell);
        const scrH = (content as any).scrollHeight || 0;
        const offH = (content as any).offsetHeight || 0;
        const rectH = content.getBoundingClientRect().height || 0;
        const h = Math.max(scrH, offH, rectH);
        neededPx = Math.max(neededPx, h);
        // Overflow behavior per policy
        (cell.style as any).overflow = enableScroll ? 'auto' : 'hidden';
      });
      let neededUnits = Math.max(1, neededPx / unitPx);
      if (snap === 'ceil') neededUnits = Math.ceil(neededUnits);
      else neededUnits = Math.round(neededUnits);
      const finalUnits = rowPolicy === 'grow' ? Math.max(allocated, neededUnits) : allocated;
      rowHeightsUnits.push(finalUnits);
    }
    // apply rows in pixels to avoid environment-specific var(--cnt-usz) differences
    const rowHeightsPx = rowHeightsUnits.map((u) => Math.max(1, Math.round(u * unitPx)));
    root.style.gridTemplateRows = rowHeightsPx.map((px) => `${px}px`).join(' ');
    const totalUnitsNow = rowHeightsUnits.reduce((a, b) => a + b, 0);
    const totalPx = (containerPolicy === 'grow' ? totalUnitsNow : totalUnits) * unitPx;
    root.style.height = `${Math.max(1, Math.round(totalPx))}px`;
  }

  // initial sizing
  refresh();

  // Observe DOM mutations to adapt when inner content (e.g., folder) expands/collapses
  const mo = new MutationObserver(() => scheduleRefresh());
  mo.observe(root, { attributes: true, childList: true, subtree: true });

  // Also observe size changes directly (covers CSS-only transitions)
  let ro: ResizeObserver | null = null;
  try {
    const Rz: any = (root.ownerDocument?.defaultView || window as any).ResizeObserver;
    if (typeof Rz === 'function') {
      ro = new Rz(() => scheduleRefresh());
      // Observe each row container and cell; safe if ResizeObserver exists
      rowElems.forEach((re) => { try { ro!.observe(re); } catch {} });
      rowCells.forEach((cells) => cells.forEach((c) => { try { ro!.observe(c); } catch {} }));
      try { ro.observe(root); } catch {}
    }
  } catch {}

  return {
    root,
    slots,
    refresh,
    dispose() {
      try { mo.disconnect(); } catch {}
      try { ro?.disconnect?.(); } catch {}
      try { root.removeEventListener('transitionend', scheduleRefresh as any, true); } catch {}
      try { container.removeChild(root); } catch {}
      while (root.firstChild) root.removeChild(root.firstChild);
    },
  };
}
