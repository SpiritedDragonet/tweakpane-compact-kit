import type { SplitDirection } from '../SplitLayoutPlugin';
import { computeColumnUnitHeightPx } from './columnUnits';

type GutterOptions = {
  doc: Document;
  root: HTMLElement;
  panelWrappers: HTMLElement[];
  direction: SplitDirection;
  sizes: number[];
  currentUnits: number[] | null;
  computeUnitPx: (fallbackEl: HTMLElement) => number;
  minSize: number;
  gutter: number;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

export function computeDraggedPairWidths(args: {
  leftVisiblePx: number;
  rightVisiblePx: number;
  deltaPx: number;
  minVisiblePx: number;
}) {
  const totalVisiblePx = args.leftVisiblePx + args.rightVisiblePx;
  const leftVisiblePx = clamp(
    args.leftVisiblePx + args.deltaPx,
    args.minVisiblePx,
    totalVisiblePx - args.minVisiblePx,
  );

  return {
    leftVisiblePx,
    rightVisiblePx: totalVisiblePx - leftVisiblePx,
  };
}

export function computeDraggedColumnPairUnits(args: {
  leftUnits: number;
  rightUnits: number;
  deltaPx: number;
  unitPx: number;
  gutterPx: number;
}) {
  const totalUnits = args.leftUnits + args.rightUnits;
  const trackPx = Math.max(1, args.unitPx + args.gutterPx);
  const leftUnits = clamp(
    args.leftUnits + Math.round(args.deltaPx / trackPx),
    1,
    totalUnits - 1,
  );

  return {
    leftUnits,
    rightUnits: totalUnits - leftUnits,
  };
}

export function attachInteractiveGutters(options: GutterOptions) {
  const {
    doc,
    root,
    panelWrappers,
    direction,
    sizes,
    currentUnits,
    computeUnitPx,
    minSize,
    gutter,
  } = options;

  const basis: number[] = (direction === 'column' && currentUnits && currentUnits.length === panelWrappers.length)
    ? currentUnits.slice()
    : sizes.slice();

  const onPointerDown = (ev: PointerEvent, idx: number) => {
    if (!(ev.target instanceof HTMLElement)) return;
    const rect = root.getBoundingClientRect();
    const startX = ev.clientX;
    const startY = ev.clientY;
    const a0 = basis[idx];
    const b0 = basis[idx + 1];
    const leftPanelRect = panelWrappers[idx].getBoundingClientRect();
    const rightPanelRect = panelWrappers[idx + 1].getBoundingClientRect();
    const leftVisiblePx0 = leftPanelRect.width;
    const rightVisiblePx0 = rightPanelRect.width;
    const rootTransition = root.style.transition;
    const panelTransitions = panelWrappers.map((panel) => panel.style.transition);
    root.style.transition = 'none';
    panelWrappers.forEach((panel) => {
      panel.style.transition = 'none';
    });

    const move = (e: PointerEvent) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (direction === 'column' && currentUnits && currentUnits.length === panelWrappers.length) {
        const unitPx = computeUnitPx(root);
        const next = computeDraggedColumnPairUnits({
          leftUnits: a0,
          rightUnits: b0,
          deltaPx: dy,
          unitPx,
          gutterPx: gutter,
        });
        const aUnits = next.leftUnits;
        const bUnits = next.rightUnits;
        basis[idx] = aUnits;
        basis[idx + 1] = bUnits;
        currentUnits[idx] = aUnits;
        currentUnits[idx + 1] = bUnits;
        panelWrappers[idx].style.flexGrow = '0';
        panelWrappers[idx].style.flexShrink = '0';
        panelWrappers[idx].style.flexBasis = `${computeColumnUnitHeightPx(aUnits, unitPx, gutter)}px`;
        panelWrappers[idx + 1].style.flexGrow = '0';
        panelWrappers[idx + 1].style.flexShrink = '0';
        panelWrappers[idx + 1].style.flexBasis = `${computeColumnUnitHeightPx(bUnits, unitPx, gutter)}px`;
        return;
      }

      const total = a0 + b0;
      if (direction === 'row') {
        const totalVisiblePx = leftVisiblePx0 + rightVisiblePx0;
        const minVisiblePx = Math.max(1, (minSize / 100) * totalVisiblePx);
        const next = computeDraggedPairWidths({
          leftVisiblePx: leftVisiblePx0,
          rightVisiblePx: rightVisiblePx0,
          deltaPx: dx,
          minVisiblePx,
        });

        panelWrappers[idx].style.flexGrow = '0';
        panelWrappers[idx].style.flexShrink = '0';
        panelWrappers[idx].style.flexBasis = `${next.leftVisiblePx}px`;
        panelWrappers[idx + 1].style.flexGrow = '0';
        panelWrappers[idx + 1].style.flexShrink = '0';
        panelWrappers[idx + 1].style.flexBasis = `${next.rightVisiblePx}px`;
        return;
      }

      const a = clamp(a0 + (dy / rect.height) * total, minSize, total - minSize);
      const b = total - a;
      basis[idx] = a;
      basis[idx + 1] = b;
      panelWrappers[idx].style.flexGrow = String(a);
      panelWrappers[idx].style.flexShrink = '0';
      panelWrappers[idx].style.flexBasis = '0px';
      panelWrappers[idx + 1].style.flexGrow = String(b);
      panelWrappers[idx + 1].style.flexShrink = '0';
      panelWrappers[idx + 1].style.flexBasis = '0px';
    };

    const up = () => {
      doc.removeEventListener('pointermove', move as any);
      doc.removeEventListener('pointerup', up as any);
      root.style.transition = rootTransition;
      panelWrappers.forEach((panel, panelIndex) => {
        panel.style.transition = panelTransitions[panelIndex] ?? '';
      });
    };

    doc.addEventListener('pointermove', move as any);
    doc.addEventListener('pointerup', up as any, { once: true });
  };

  const handles: HTMLElement[] = [];
  const refresh = () => {
    if (getComputedStyle(root).position === 'static') {
      root.style.position = 'relative';
    }

    handles.forEach((handle) => handle.remove());
    handles.length = 0;

    const rootRect = root.getBoundingClientRect();
    for (let i = 0; i < panelWrappers.length - 1; i++) {
      const panelRect = panelWrappers[i].getBoundingClientRect();
      const handle = doc.createElement('div');
      handle.className = 'tp-split-gutter';
      handle.style.position = 'absolute';
      handle.style.background = 'transparent';
      handle.style.cursor = direction === 'row' ? 'col-resize' : 'row-resize';

      if (direction === 'row') {
        handle.style.left = `${panelRect.right - rootRect.left}px`;
        handle.style.top = '0';
        handle.style.width = `${gutter}px`;
        handle.style.height = '100%';
      } else {
        handle.style.left = '0';
        handle.style.top = `${panelRect.bottom - rootRect.top}px`;
        handle.style.width = '100%';
        handle.style.height = `${gutter}px`;
      }

      handle.addEventListener('pointerdown', (e) => onPointerDown(e as PointerEvent, i));
      root.appendChild(handle);
      handles.push(handle);
    }
  };

  const ro = new ResizeObserver(() => refresh());
  ro.observe(root);
  setTimeout(refresh, 0);

  return {
    refresh,
    cleanup: () => {
      ro.disconnect();
      handles.forEach((handle) => handle.remove());
    },
  };
}
