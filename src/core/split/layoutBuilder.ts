import type { SplitDirection, SplitLayoutParams } from '../SplitLayoutPlugin';
import { measureCssUnit, readUnitPx } from '../shared/measure';
import { normalizeSplitParams, type NormalizedSplitLayoutParams } from './params';
import { resolveSizeTokens, toFlexSpec } from './sizeExpressions';
import { buildVisibleBasisCss } from './singleGeometry';
import { readDeclaredUnitState, setDeclaredUnitState } from './domUnitState';
import { computeMeasuredUnits, computeNodeLiveUnits, computeSpanHeightPx } from './unitModel';
import { setSplitRootHorizontalInset } from './rootInset';

type VerticalState = {
  getBaseUnits: () => number;
  getLiveUnits: () => number;
  setBaseUnits: (nextUnits: number) => void;
  refresh: () => void;
};

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
  getBaseUnits: () => number;
  getLiveUnits: () => number;
  setBaseUnits: (nextUnits: number) => void;
  refreshLayout: () => void;
  childStates: VerticalState[];
};

type BuildOptions = {
  path?: number[];
  envEl?: HTMLElement;
  installLeafPatch?: (container: HTMLElement) => (() => void) | void;
  onUnitsChange?: () => void;
  useHorizontalInset?: boolean;
};

const SPLIT_ROOT_TRANSITION = 'height 0.2s ease-in-out';
const SPLIT_PANEL_TRANSITION = 'flex-basis 0.2s ease-in-out, margin-top 0.2s ease-in-out';

function normalizeSizes(count: number, sizes?: number[]): number[] {
  if (!sizes || sizes.length !== count) {
    return Array.from({ length: count }, () => (count > 0 ? 100 / count : 0));
  }
  const sum = sizes.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0) || 1;
  return sizes.map((s) => (Number.isFinite(s) ? (s / sum) * 100 : 0));
}

function toUnits(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.floor(value));
}

function isElementHidden(el: HTMLElement): boolean {
  const doc = el.ownerDocument;
  const win = doc.defaultView;
  if (!win) {
    return false;
  }
  const style = win.getComputedStyle(el);
  return style.display === 'none' || style.visibility === 'hidden';
}

function getVisibleElementChildren(el: HTMLElement): HTMLElement[] {
  return Array.from(el.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement && !isElementHidden(child),
  );
}

function shouldExpandDeclaredUnitSearch(el: HTMLElement): boolean {
  const classes = el.classList;
  return classes.contains('tp-rotv')
    || classes.contains('tp-rotv_c')
    || classes.contains('tp-lblv')
    || classes.contains('tp-lblv_v');
}

function expandCompoundHostItem(root: HTMLElement): HTMLElement[] {
  if (!root.classList.contains('tp-rotv')) {
    return [root];
  }

  const content = Array.from(root.children).find(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.classList.contains('tp-rotv_c'),
  );
  if (!content) {
    return [root];
  }

  const contentItems = getVisibleElementChildren(content);
  if (contentItems.length > 1) {
    return contentItems;
  }

  return [root];
}

function collectHostItems(container: HTMLElement): HTMLElement[] {
  return getVisibleElementChildren(container).flatMap((child) => expandCompoundHostItem(child));
}

function resolveDeclaredUnitsForHostItem(item: HTMLElement): number | null {
  const queue: HTMLElement[] = [item];
  const visited = new Set<HTMLElement>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current) || isElementHidden(current)) {
      continue;
    }
    visited.add(current);

    const declared = readDeclaredUnitState(current);
    if (declared) {
      return computeNodeLiveUnits(
        declared.behavior === 'fixed'
          ? { kind: 'fixed', baseUnits: declared.baseUnits }
          : {
              kind: 'adaptive',
              baseUnits: declared.baseUnits,
              liveUnits: declared.liveUnits,
            },
      );
    }

    if (shouldExpandDeclaredUnitSearch(current)) {
      queue.push(...getVisibleElementChildren(current));
    }
  }

  return null;
}

function getDirectChildByClass(root: HTMLElement, className: string): HTMLElement | null {
  return Array.from(root.children).find(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.classList.contains(className),
  ) ?? null;
}

function resolveKnownFolderRoot(item: HTMLElement): HTMLElement | null {
  if (item.classList.contains('tp-fldv')) {
    return item;
  }

  if (!item.classList.contains('tp-rotv')) {
    return null;
  }

  const content = getDirectChildByClass(item, 'tp-rotv_c');
  if (!content) {
    return null;
  }

  const visibleItems = getVisibleElementChildren(content);
  if (visibleItems.length !== 1) {
    return null;
  }

  return visibleItems[0].classList.contains('tp-fldv') ? visibleItems[0] : null;
}

function computeFolderUnits(
  folderRoot: HTMLElement,
  unitPx: number,
  gutter: number,
): number {
  const content = getDirectChildByClass(folderRoot, 'tp-fldv_c');
  if (!content || !folderRoot.classList.contains('tp-fldv-expanded')) {
    return 1;
  }

  return 1 + resolveHostContentUnits(content, unitPx, gutter);
}

function resolveKnownUnitsForHostItem(
  item: HTMLElement,
  unitPx: number,
  gutter: number,
): number | null {
  const folderRoot = resolveKnownFolderRoot(item);
  if (folderRoot) {
    return computeFolderUnits(folderRoot, unitPx, gutter);
  }

  return null;
}

function resolveHostContentUnits(
  container: HTMLElement,
  unitPx: number,
  gutter: number,
): number {
  if (isElementHidden(container)) {
    return 0;
  }

  const hostItems = collectHostItems(container);
  if (hostItems.length === 0) {
    return 0;
  }

  return hostItems.reduce((sum, item) => {
    const knownUnits = resolveKnownUnitsForHostItem(item, unitPx, gutter);
    if (knownUnits !== null) {
      return sum + knownUnits;
    }

    const declaredUnits = resolveDeclaredUnitsForHostItem(item);
    if (declaredUnits !== null) {
      return sum + declaredUnits;
    }

    return sum + computeMeasuredUnits(
      measureIntrinsicHeightPx(item),
      unitPx,
      gutter,
      'safe',
    );
  }, 0);
}

function measureIntrinsicHeightPx(container: HTMLElement): number {
  if (isElementHidden(container)) {
    return 0;
  }

  if (container.classList.contains('tp-lblv') || container.classList.contains('tp-fldv')) {
    const prevHeight = container.style.height;
    const prevFlex = container.style.flex;
    const hasExplicitHeight = !!(prevHeight && prevHeight !== 'auto');

    if (!hasExplicitHeight) {
      container.style.height = 'auto';
      container.style.flex = '0 0 auto';
    }

    const measured = Math.max(
      container.scrollHeight || 0,
      container.getBoundingClientRect().height || 0,
    );

    if (!hasExplicitHeight) {
      container.style.height = prevHeight;
      container.style.flex = prevFlex;
    }

    return measured;
  }

  const measureTarget = (target: HTMLElement): number => {
    if (isElementHidden(target)) {
      return 0;
    }

    const prevHeight = target.style.height;
    const prevFlex = target.style.flex;
    const hasExplicitHeight = !!(prevHeight && prevHeight !== 'auto');

    if (!hasExplicitHeight) {
      target.style.height = 'auto';
      target.style.flex = '0 0 auto';
    }

    const measured = Math.max(
      target.scrollHeight || 0,
      target.getBoundingClientRect().height || 0,
    );

    if (!hasExplicitHeight) {
      target.style.height = prevHeight;
      target.style.flex = prevFlex;
    }

    return measured;
  };

  const visibleChildren = getVisibleElementChildren(container);
  const paneControl = container.querySelector('.tp-rotv_c > :not(.tp-v-hidden)') as HTMLElement | null;
  const intrinsic = paneControl || visibleChildren[0] || container;

  if (visibleChildren.length === 0 && !paneControl) {
    return measureTarget(container);
  }

  if (paneControl) {
    return measureTarget(paneControl);
  }

  if (visibleChildren.length === 1 && intrinsic !== container) {
    return measureTarget(intrinsic);
  }

  return measureTarget(container);
}

export function buildSplitLayout(
  doc: Document,
  params: NormalizedSplitLayoutParams,
  options: BuildOptions = {},
): BuildResult {
  const { envEl, installLeafPatch, onUnitsChange, path = [] } = options;
  const useHorizontalInset = options.useHorizontalInset ?? true;
  const direction: SplitDirection = params.direction;
  const children = params.children || [];
  const n = children.length;
  const sizeTokens = params.sizes;
  const minSize = params.minSize ?? 20;
  const gutter = params.gutter ?? 4;
  const axisAnchor = envEl || doc.body;
  const axisRect = axisAnchor.getBoundingClientRect();
  const estimatedAxisPx = axisRect.width || axisAnchor.clientWidth || 1000;
  const sizes = direction === 'row'
    ? normalizeSizes(n, resolveSizeTokens(sizeTokens, estimatedAxisPx, gutter))
    : Array.from({ length: n }, () => 0);
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
  root.style.display = 'flex';
  root.style.flexDirection = direction === 'row' ? 'row' : 'column';
  root.style.width = '100%';
  root.style.boxSizing = 'border-box';
  root.style.overflow = 'hidden';
  root.style.transition = SPLIT_ROOT_TRANSITION;
  setSplitRootHorizontalInset(root, useHorizontalInset);
  root.style.gap = direction === 'row' ? `${gutter}px` : '0px';

  const disposers: Array<() => void> = [];
  const leaves: HTMLElement[] = [];
  const panelWrappers: HTMLElement[] = [];
  const childStates: VerticalState[] = [];
  const directHostStates: VerticalState[] = [];
  const currentUnits = direction === 'column' ? Array.from({ length: n }, () => 0) : null;

  let baseUnits = toUnits(params.units);
  let liveUnits = baseUnits;
  let refreshHandles = () => {};
  let initialized = false;
  let disposed = false;

  const notifyUnitsChange = () => {
    if (initialized) {
      onUnitsChange?.();
    }
  };

  const refreshLayout = () => {
    const unitPx = computeUnitPx(root);
    const childLiveUnits = childStates.map((state) => state.getLiveUnits());

    liveUnits = direction === 'row'
      ? computeNodeLiveUnits({
          kind: 'row',
          baseUnits,
          children: childLiveUnits.map((units) => ({
            kind: 'adaptive',
            baseUnits: 0,
            liveUnits: units,
          })),
        })
      : computeNodeLiveUnits({
          kind: 'column',
          baseUnits,
          children: childLiveUnits.map((units) =>
            units <= 0
              ? { kind: 'empty', baseUnits: 0 }
              : { kind: 'adaptive', baseUnits: 0, liveUnits: units }),
        });

    setDeclaredUnitState(root, {
      baseUnits,
      liveUnits,
      behavior: 'adaptive',
    });
    root.style.height = `${computeSpanHeightPx(liveUnits, unitPx, gutter)}px`;

    if (direction === 'row') {
      panelWrappers.forEach((panel, index) => {
        panel.style.display = 'flex';
        panel.style.flexGrow = '0';
        panel.style.flexShrink = '0';
        panel.style.flexBasis = rowBasis?.[index] ?? '0px';
        panel.style.height = '100%';
      });
    } else {
      let seenVisiblePanel = false;
      panelWrappers.forEach((panel, index) => {
        const units = childStates[index]?.getLiveUnits() ?? 0;
        if (currentUnits) {
          currentUnits[index] = units;
        }

        panel.style.display = 'flex';
        panel.style.flexGrow = '0';
        panel.style.flexShrink = '0';
        panel.style.marginTop = seenVisiblePanel && units > 0 ? `${gutter}px` : '0px';

        if (units <= 0) {
          panel.style.flexBasis = '0px';
          return;
        }

        panel.style.flexBasis = `${computeSpanHeightPx(units, unitPx, gutter)}px`;
        seenVisiblePanel = true;
      });
    }

    refreshHandles();
    notifyUnitsChange();
  };

  const setBaseUnits = (nextUnits: number) => {
    const safeUnits = toUnits(nextUnits);
    if (safeUnits === baseUnits) {
      return;
    }
    baseUnits = safeUnits;
    refreshLayout();
  };

  const createHostState = (container: HTMLElement): VerticalState => {
    let hostBaseUnits = 0;
    let liveHostUnits = 0;
    let refreshQueued = false;

    const refreshHost = () => {
      liveHostUnits = resolveHostContentUnits(container, computeUnitPx(root), gutter);
      refreshLayout();
    };

    const scheduleRefreshHost = () => {
      if (refreshQueued || disposed) {
        return;
      }
      refreshQueued = true;

      const run = () => {
        refreshQueued = false;
        if (disposed) {
          return;
        }
        refreshHost();
      };

      if (typeof queueMicrotask === 'function') {
        queueMicrotask(run);
        return;
      }

      Promise.resolve().then(run).catch(() => {});
    };

    try {
      const ro = new ResizeObserver(() => {
        scheduleRefreshHost();
      });
      ro.observe(container);
      disposers.push(() => {
        ro.disconnect();
      });
    } catch {}

    try {
      const mo = new MutationObserver((records) => {
        const shouldRefresh = records.some((record) =>
          record.type === 'childList'
          || (record.type === 'attributes'
            && (record.attributeName === 'class'
              || record.attributeName === 'hidden')));

        if (shouldRefresh) {
          scheduleRefreshHost();
        }
      });
      mo.observe(container, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['class', 'hidden'],
      });
      disposers.push(() => {
        mo.disconnect();
      });
    } catch {}

    return {
      getBaseUnits: () => hostBaseUnits,
      getLiveUnits: () => {
        if (isElementHidden(container)) {
          return 0;
        }
        return Math.max(hostBaseUnits, liveHostUnits);
      },
      setBaseUnits: (nextUnits: number) => {
        const safeUnits = toUnits(nextUnits);
        if (safeUnits === hostBaseUnits) {
          return;
        }
        hostBaseUnits = safeUnits;
        refreshLayout();
      },
      refresh: refreshHost,
    };
  };

  for (let i = 0; i < n; i++) {
    const panel = doc.createElement('div');
    panel.className = 'tp-split-panel';
    panel.style.minWidth = direction === 'row' ? '0' : '100%';
    panel.style.minHeight = direction === 'column' ? '0' : '100%';
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    panel.style.boxSizing = 'border-box';
    panel.style.overflow = 'hidden';
    panel.style.transition = SPLIT_PANEL_TRANSITION;

    if (direction === 'row') {
      panel.style.flexGrow = '0';
      panel.style.flexShrink = '0';
      panel.style.flexBasis = rowBasis?.[i] ?? '0px';
      panel.style.height = '100%';
    } else {
      panel.style.width = '100%';
    }

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

      const hostState = createHostState(container);
      childStates.push(hostState);
      directHostStates.push(hostState);
      continue;
    }

    if (child && (child as any).view === 'split-layout') {
      const nested = buildSplitLayout(doc, normalizeSplitParams(child as SplitLayoutParams), {
        path: path.concat(i),
        envEl,
        installLeafPatch,
        onUnitsChange: () => {
          refreshLayout();
        },
        useHorizontalInset: false,
      });
      container.appendChild(nested.element);
      leaves.push(...nested.leaves);
      disposers.push(nested.cleanup);
      childStates.push({
        getBaseUnits: nested.getBaseUnits,
        getLiveUnits: nested.getLiveUnits,
        setBaseUnits: nested.setBaseUnits,
        refresh: nested.refreshLayout,
      });
      continue;
    }

    container.style.display = 'block';
    container.style.width = '100%';
    container.style.height = 'auto';
    leaves.push(container);
    const hostState = createHostState(container);
    childStates.push(hostState);
    directHostStates.push(hostState);
  }

  refreshLayout();
  initialized = true;

  const scheduleInitialHostRefresh = () => {
    const run = () => {
      if (disposed) {
        return;
      }
      directHostStates.forEach((state) => {
        state.refresh();
      });
    };

    if (typeof queueMicrotask === 'function') {
      queueMicrotask(run);
      return;
    }

    Promise.resolve().then(run).catch(() => {});
  };

  scheduleInitialHostRefresh();

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
      disposed = true;
      disposers.forEach((dispose) => dispose());
    },
    setRefreshHandles: (refresh) => {
      refreshHandles = refresh;
    },
    getBaseUnits: () => baseUnits,
    getLiveUnits: () => liveUnits,
    setBaseUnits,
    refreshLayout,
    childStates,
  };
}
