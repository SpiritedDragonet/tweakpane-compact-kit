import type { SplitDirection, SplitLayoutParams } from '../SplitLayoutPlugin';
import { measureCssUnit, readUnitPx } from '../shared/measure';
import { normalizeSplitParams, type NormalizedSplitLayoutParams } from './params';
import { resolveSizeTokens, toFlexSpec } from './sizeExpressions';
import { buildVisibleBasisCss } from './singleGeometry';

export type BuildResult = {
  element: HTMLElement;
  leaves: HTMLElement[];
  panelWrappers: HTMLElement[];
  sizes: number[];
  currentUnits: number[] | null;
  direction: SplitDirection;
  gutter: number;
  minSize: number;
  computeUnitPx: (fallbackEl: HTMLElement) => number;
  cleanup: () => void;
  setRefreshHandles: (refresh: () => void) => void;
};

type BuildOptions = {
  path?: number[];
  envEl?: HTMLElement;
  installLeafPatch?: (container: HTMLElement) => (() => void) | void;
};

function normalizeSizes(count: number, sizes?: number[]): number[] {
  if (!sizes || sizes.length !== count) {
    return Array.from({ length: count }, () => 100 / count);
  }
  const sum = sizes.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0) || 1;
  return sizes.map((s) => (Number.isFinite(s) ? (s / sum) * 100 : 0));
}

function toCssLength(value: number | string | undefined, fallbackPx: number): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `${value}px`;
  }
  if (typeof value === 'string' && value.trim()) {
    return value;
  }
  return `${fallbackPx}px`;
}

export function buildSplitLayout(
  doc: Document,
  params: NormalizedSplitLayoutParams,
  options: BuildOptions = {},
): BuildResult {
  const { envEl, installLeafPatch, path = [] } = options;
  const direction: SplitDirection = params.direction;
  const children = params.children || [];
  const n = children.length;
  const sizeTokens = params.sizes;
  const minSize = params.minSize ?? 20;
  const gutter = params.gutter ?? 4;
  const axisAnchor = envEl || doc.body;
  const axisRect = axisAnchor.getBoundingClientRect();
  const estimatedAxisPx = direction === 'row'
    ? axisRect.width || axisAnchor.clientWidth || 1000
    : axisRect.height || axisAnchor.clientHeight || 1000;
  let sizes = normalizeSizes(n, resolveSizeTokens(sizeTokens, estimatedAxisPx, gutter));
  const rowUnits = direction === 'column' ? params.rowUnits : undefined;
  const rowBasis = direction === 'row' ? buildVisibleBasisCss(sizeTokens, gutter) : null;
  const computeUnitPx = (fallbackEl: HTMLElement): number => {
    const anchor = envEl || doc.body || fallbackEl;
    return (
      readUnitPx(anchor, 0)
      || readUnitPx(fallbackEl, 0)
      || measureCssUnit(anchor, '--cnt-usz', 1, fallbackEl)
      || measureCssUnit(fallbackEl, '--cnt-usz', 1, anchor)
    );
  };

  const root = doc.createElement('div');
  root.className = 'tp-split-root';
  root.classList.add(direction === 'row' ? 'tp-split-root-row' : 'tp-split-root-column');
  root.style.display = 'flex';
  root.style.flexDirection = direction === 'row' ? 'row' : 'column';
  root.style.width = '100%';
  root.style.boxSizing = 'border-box';

  let unitPxForColumn: number | null = null;
  let currentUnits: number[] | null = null;
  let refreshHandles = () => {};

  if (direction === 'column') {
    if (rowUnits && rowUnits.length === n) {
      if (params.height !== undefined) {
        root.style.height = toCssLength(params.height, 160);
        sizes = normalizeSizes(n, rowUnits);
      } else {
        unitPxForColumn = computeUnitPx(root);
        currentUnits = rowUnits.map((u) => Math.max(1, Math.floor(u || 0)));
        const totalUnits = currentUnits.reduce((a, b) => a + b, 0) || n;
        sizes = currentUnits.map((u) => (u / totalUnits) * 100);
        const gapPx = (n > 1 ? (n - 1) * gutter : 0);
        const hPx = totalUnits * unitPxForColumn + gapPx;
        root.style.height = `${hPx}px`;
      }
    } else {
      root.style.height = toCssLength(params.height, 160);
    }
  } else if (params.height !== undefined) {
    root.style.height = toCssLength(params.height, 160);
  }

  root.style.gap = `${gutter}px`;

  const disposers: Array<() => void> = [];
  const leaves: HTMLElement[] = [];
  const panelWrappers: HTMLElement[] = [];

  for (let i = 0; i < n; i++) {
    const panel = doc.createElement('div');
    panel.className = 'tp-split-panel';

    if (direction === 'row') {
      panel.style.flexGrow = '0';
      panel.style.flexShrink = '0';
      panel.style.flexBasis = rowBasis?.[i] ?? '0px';
      panel.style.height = '100%';
    } else {
      if (rowUnits && rowUnits.length === n) {
        const weight = currentUnits ? sizes[i] : rowUnits[i];
        panel.style.flexGrow = String(Math.max(0.0001, weight));
        panel.style.flexShrink = '0';
        panel.style.flexBasis = '0px';
      } else {
        const flexSpec = toFlexSpec(sizeTokens[i], sizes[i]);
        panel.style.flexGrow = String(flexSpec.grow);
        panel.style.flexShrink = String(flexSpec.shrink);
        panel.style.flexBasis = flexSpec.basis;
      }
      panel.style.width = '100%';
    }

    panel.style.minWidth = direction === 'row' ? '0' : '100%';
    panel.style.minHeight = direction === 'column' ? '0' : '100%';
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    panel.style.boxSizing = 'border-box';

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

  for (let i = 0; i < n; i++) {
    const child = children[i];
    const container = panelWrappers[i].firstElementChild as HTMLElement;

    if (typeof child === 'string') {
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'stretch';
      container.style.width = '100%';
      container.style.height = 'auto';
      container.style.minHeight = '0';
      container.classList.add('tp-split-leaf');
      container.style.boxSizing = 'border-box';

      try {
        container.dataset.splitPath = path.concat(i).join('.');
        container.dataset.leafCategory = child;
      } catch {}

      leaves.push(container);

      if (installLeafPatch) {
        try {
          const cleanupLeafPatch = installLeafPatch(container);
          if (cleanupLeafPatch) {
            disposers.push(cleanupLeafPatch);
          }
        } catch {}
      }

      if (direction === 'column' && currentUnits && rowUnits && rowUnits.length === n) {
        try {
          const ro = new ResizeObserver(() => {
            try {
              const unitPx = unitPxForColumn || computeUnitPx(root);
              const folder = container.querySelector('.tp-fldv') as HTMLElement | null;
              let h = 0;

              if (folder) {
                const hdr = folder.querySelector('.tp-fldv_b') as HTMLElement | null;
                const cnt = folder.querySelector('.tp-fldv_c') as HTMLElement | null;
                const relax = (t: HTMLElement | null): number => {
                  if (!t) return 0;
                  const prevHeight = t.style.height;
                  const prevFlex = t.style.flex;
                  const hasExplicit = !!(prevHeight && prevHeight !== 'auto');

                  if (!hasExplicit) {
                    try {
                      t.style.height = 'auto';
                      t.style.flex = '0 0 auto';
                    } catch {}
                  }

                  const scrollHeight = t.scrollHeight || 0;
                  const rectHeight = t.getBoundingClientRect().height || 0;
                  const measured = Math.max(scrollHeight, rectHeight);

                  if (!hasExplicit) {
                    try {
                      t.style.height = prevHeight;
                      t.style.flex = prevFlex;
                    } catch {}
                  }

                  return measured;
                };

                h = relax(hdr) + relax(cnt);
              } else {
                const intrinsic = (container.querySelector('.tp-rotv_c') as HTMLElement | null)
                  || (container.firstElementChild as HTMLElement | null)
                  || container;
                const prevHeight = intrinsic.style.height;
                const prevFlex = intrinsic.style.flex;
                const hasExplicit = !!(prevHeight && prevHeight !== 'auto');
                const isDomLeaf = intrinsic.classList?.contains('tp-demo-domleaf');

                if (!hasExplicit && !isDomLeaf) {
                  try {
                    intrinsic.style.height = 'auto';
                    intrinsic.style.flex = '0 0 auto';
                  } catch {}
                }

                const scrollHeight = intrinsic.scrollHeight || 0;
                const rectHeight = intrinsic.getBoundingClientRect().height || 0;
                h = Math.max(scrollHeight, rectHeight);

                if (!hasExplicit && !isDomLeaf) {
                  try {
                    intrinsic.style.height = prevHeight;
                    intrinsic.style.flex = prevFlex;
                  } catch {}
                }
              }

              const assumedUnits = Number.isFinite(currentUnits?.[i]) ? Math.max(1, Math.floor(currentUnits[i])) : 1;
              const gapOffset = Math.max(0, (assumedUnits - 1) * gutter);
              const effectiveH = Math.max(0, h - gapOffset);
              const need = Math.max(1, Math.min(64, Math.ceil(effectiveH / Math.max(1, unitPx))));

              if (currentUnits && need !== currentUnits[i]) {
                currentUnits[i] = need;
                panelWrappers[i].style.flex = `0 0 ${need * unitPx}px`;
                const totalUnits = currentUnits.reduce((a, b) => a + b, 0) || n;
                const gapPx = (n > 1 ? (n - 1) * gutter : 0);
                root.style.height = `${totalUnits * unitPx + gapPx}px`;
                refreshHandles();
              }
            } catch {}
          });

          ro.observe(container);
          disposers.push(() => {
            try {
              ro.disconnect();
            } catch {}
          });
        } catch {}
      }
    } else if (child && (child as any).view === 'split-layout') {
      const nested = buildSplitLayout(doc, normalizeSplitParams(child as SplitLayoutParams), {
        path: path.concat(i),
        envEl,
        installLeafPatch,
      });
      container.appendChild(nested.element);
      leaves.push(...nested.leaves);
      disposers.push(nested.cleanup);
    } else {
      container.style.display = 'block';
      container.style.width = '100%';
      container.style.height = '100%';
      leaves.push(container);
    }
  }

  return {
    element: root,
    leaves,
    panelWrappers,
    sizes,
    currentUnits,
    direction,
    gutter,
    minSize,
    computeUnitPx,
    cleanup: () => {
      disposers.forEach((dispose) => dispose());
    },
    setRefreshHandles: (refresh) => {
      refreshHandles = refresh;
    },
  };
}
