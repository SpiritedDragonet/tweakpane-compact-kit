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

// Params after normalization, used internally by builder/controller
type NormalizedSplitLayoutParams = {
  view: 'split-layout';
  direction: SplitDirection;
  sizes: number[]; // normalized percentages per child (sum ~100)
  children: SplitLayoutNode[];
  rowUnits?: number[]; // normalized when direction === 'column'
  height?: number | string;
  gutter: number; // px
  minSize: number;
  interactive: boolean;
  compactSliders: boolean;
};

type BuildResult = {
  element: HTMLElement;
  leaves: HTMLElement[]; // in DFS order
  cleanup: () => void;
};

// Parse size expression into normalized percentages
// Only supports: number[] arrays and string ('1fr 2fr' or 'equal')
function parseSizeExpression(expr: SizeExpression | undefined, count: number = 2): number[] {
  if (!expr) {
    // Default to equal split
    return Array.from({ length: count }, () => 100 / count);
  }

  // Handle 'equal' keyword
  if (expr === 'equal') {
    return Array.from({ length: count }, () => 100 / count);
  }

  // Handle string expressions: '1fr 2fr 1fr' or '100px 200px 30%'
  if (typeof expr === 'string') {
    const parts = expr.trim().split(/\s+/).filter(p => p);
    if (parts.length === 0) return Array.from({ length: count }, () => 100 / count);

    const values = parts.map(part => {
      if (part.endsWith('fr')) {
        return parseFloat(part);
      } else if (part.endsWith('px')) {
        return parseFloat(part);
      } else if (part.endsWith('%')) {
        return parseFloat(part) / 100;
      }
      return parseFloat(part) || 1;
    });

    const hasFr = parts.some(p => p.endsWith('fr'));
    if (hasFr) {
      const totalFr = parts.filter(p => p.endsWith('fr')).reduce((sum, p) => sum + parseFloat(p), 0);
      return values.map((v, i) => {
        if (parts[i].endsWith('fr')) {
          return (v / totalFr) * 100;
        }
        // Convert px/% to approximate fr equivalent (assuming 1000px total)
        return Math.min(v * 10, 100); // Rough conversion
      });
    }

    // All px/% values
    const total = values.reduce((a, b) => a + b, 0);
    return total > 0 ? values.map(v => (v / total) * 100) : Array.from({ length: count }, () => 100 / count);
  }

  // Handle number[] arrays: [66, 34] or [1, 2, 1]
  if (Array.isArray(expr)) {
    if (expr.length === 0) return Array.from({ length: count }, () => 100 / count);
    const total = expr.reduce((a, b) => a + b, 0);
    return total > 0 ? expr.map(v => (v / total) * 100) : Array.from({ length: expr.length }, () => 100 / expr.length);
  }

  return Array.from({ length: count }, () => 100 / count);
}

function normalizeSplitParams(input: any): NormalizedSplitLayoutParams {
  // Clone to avoid mutating caller object
  const p: any = { ...input };
  const dir: SplitDirection = p.direction === 'column' ? 'column' : 'row';

  // Parse children
  const children: SplitLayoutNode[] = Array.isArray(p.children) ? p.children.slice() : [];

  // Determine panel count from sizes or children
  let panelCount = children.length || 2;
  if (Array.isArray(p.sizes)) {
    panelCount = Math.max(panelCount, p.sizes.length);
  } else if (typeof p.sizes === 'string' && p.sizes !== 'equal') {
    const parts = p.sizes.trim().split(/\s+/).filter((x: string) => x);
    if (parts.length > 0) panelCount = Math.max(panelCount, parts.length);
  }

  // Ensure we have enough children
  while (children.length < panelCount) {
    children.push('leaf');
  }

  // Parse sizes
  const sizes = parseSizeExpression(p.sizes, panelCount);

  // Normalize gutter/gap
  const gutter = p.gap !== undefined ? (typeof p.gap === 'string' ? parseInt(p.gap) || 6 : p.gap) :
                 typeof p.gutter === 'string' ? parseInt(p.gutter) || 6 :
                 typeof p.gutter === 'number' ? p.gutter : 6;

  // Parse rowUnits if present
  const rowUnits = p.rowUnits ? parseSizeExpression(p.rowUnits, children.length) : undefined;

  return {
    view: 'split-layout',
    direction: dir,
    sizes,
    children,
    rowUnits,
    height: p.height,
    gutter,
    minSize: typeof p.minSize === 'number' ? p.minSize : 20,
    interactive: !!p.interactive,
    compactSliders: p.compactSliders !== false,
  };
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
  params: NormalizedSplitLayoutParams,
  path: number[] = [],
  envEl?: HTMLElement,
): BuildResult {
  const direction: SplitDirection = params.direction;
  const children = params.children || [];
  const n = children.length;
  // params.sizes is already normalized to number[] by normalizeSplitParams
  let sizes = normalizeSizes(n, params.sizes);
  // Allow zero-width panels when dragging unless caller overrides
  const minSize = params.minSize ?? 20;
  // Use specified gutter or default to 4px for tight visuals
  const gutter = params.gutter ?? 4;
  const interactive = !!params.interactive; // default static
  // rowUnits is already normalized to number[] by normalizeSplitParams
  const rowUnits = direction === 'column' ? params.rowUnits : undefined;
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
        // rowUnits is now percentage-based (0-100), convert to actual pixels
        const percentage = Math.max(0.0001, rowUnits[i]);
        panel.style.flexGrow = String(percentage);
        panel.style.flexShrink = '0';
        panel.style.flexBasis = '0px';
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
    // Check if child is a string (leaf category) - allows user-defined categories
    if (typeof child === 'string') {
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'stretch';
      container.style.width = '100%';
      container.style.height = 'auto';
      container.style.minHeight = '0';
      container.classList.add('tp-split-leaf');
      // No automatic label hiding here; label policy is enforced via pane wrapper at addBinding time
      container.style.boxSizing = 'border-box';
      try {
        (container.dataset as any).splitPath = path.concat(i).join('.');
        (container.dataset as any).leafCategory = child; // Store user-defined category
      } catch {}
      leaves.push(container);
      paneEls.push(container);
      // Auto-apply slider label tweaks for this leaf
      try {
        const cleanupSlider = installSliderLabelAutoTweak(container, params.compactSliders !== false, false);
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
              // Subtract internal gaps for multi-unit panels so 3u content with 2*gutter doesn't round to 4u
              const assumedUnits = (currentUnits && Number.isFinite(currentUnits[i])) ? Math.max(1, Math.floor(currentUnits[i])) : 1;
              const gapOffset = Math.max(0, (assumedUnits - 1) * gutter);
              const effectiveH = Math.max(0, h - gapOffset);
              const need = Math.max(1, Math.min(MAX_UNITS, Math.ceil(effectiveH / Math.max(1, unitPx))));
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
      // Normalize nested split-layout node before building
      const res = buildSplit(doc, normalizeSplitParams(child as SplitLayoutParams), path.concat(i), envEl);
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
  public blade: any;
  public viewProps: any;
  public slots: HTMLElement[];
  private _dispose: () => void;
  constructor(args: any) {
    const doc: Document = args.document ?? document;
    const params: NormalizedSplitLayoutParams = normalizeSplitParams(args.params);
    const built = buildSplit(doc, params);
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
  const built = buildSplit(doc, norm, [], hostEl);
  hostEl.appendChild(built.element);

  return {
    getSlots(): HTMLElement[] { return built.leaves.slice(); },
    dispose() { try { built.cleanup(); } catch {} try { hostEl.removeChild(built.element); } catch {} },
    element: built.element,
  };
}
