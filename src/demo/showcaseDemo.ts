import * as Essentials from '@tweakpane/plugin-essentials';
import { Pane } from 'tweakpane';

import { CompactKitBundle } from '../index';
import { renderDonutGaugeSvg } from './donutGaugeSvg';
import { collectShowcaseSvgExports, type ShowcaseSvgExport } from './exportPaneSvg';

type SplitApi = {
  getSlots(): HTMLElement[];
  getSlotsByCategory?: (category: string) => HTMLElement[];
  wrapPane?: (pane: Pane) => void;
  dispose?: () => void;
};

type FolderLike = {
  addBinding: (
    obj: Record<string, unknown>,
    key: string,
    params?: Record<string, unknown>,
  ) => unknown;
  addButton?: (params: { title: string }) => unknown;
};

export type ShowcaseMountOptions = {
  captureMode?: boolean;
  writeCapturedSvgs?: (exports: ShowcaseSvgExport[]) => Promise<{count?: number} | void>;
};

export type ShowcaseMountResult = {
  exportTargets: Map<string, HTMLElement>;
  destroy: () => void;
};

const ICONS = {
  sliders: {
    path: 'M3 4h10M2 8h12M5 12h6',
    viewBox: '0 0 16 16',
  },
  power: {
    path: 'M8 2v5M5.2 4.5a4.5 4.5 0 1 0 5.6 0',
    viewBox: '0 0 16 16',
  },
  graph: {
    path: 'M2.5 11.5 6 8l2.5 2.5 5-6M3 3v10h10',
    viewBox: '0 0 16 16',
  },
} as const;

function toSplitApi(value: unknown) {
  return value as SplitApi;
}

function ensureRegistered(pane: Pane, options?: { essentials?: boolean }) {
  pane.registerPlugin(CompactKitBundle);
  if (options?.essentials) {
    try {
      pane.registerPlugin(Essentials);
    } catch {}
  }
}

function tryWrapPane(split: SplitApi, pane: Pane) {
  try {
    split.wrapPane?.(pane);
  } catch {}
}

function createChildPane(split: SplitApi, slot: HTMLElement, options?: { essentials?: boolean }) {
  const pane = new Pane({ container: slot });
  tryWrapPane(split, pane);
  ensureRegistered(pane, options);
  return pane;
}

function unitPx(el: HTMLElement): number {
  try {
    const value = getComputedStyle(el).getPropertyValue('--cnt-usz').trim();
    const match = value.match(/([0-9]+\.?[0-9]*)\s*px/i);
    if (match) {
      return Math.max(1, Math.round(Number.parseFloat(match[1])));
    }
  } catch {}
  return 18;
}

function mountDomUnits(slot: HTMLElement, units: number, render?: (box: HTMLElement) => void) {
  const box = document.createElement('div');
  box.className = 'tp-demo-domleaf';
  const gutter = 4;
  box.style.height = `calc(${units} * var(--cnt-usz) + ${(units - 1) * gutter}px)`;
  box.style.display = 'grid';
  box.style.placeItems = 'center';
  box.style.fontSize = '12px';
  slot.appendChild(box);
  if (render) {
    render(box);
  } else {
    box.textContent = `${units}u DOM (not a Tweakpane control)`;
  }
  return box;
}

function createRafScheduler(task: () => void) {
  let rafId = 0;

  const run = () => {
    if (rafId !== 0) {
      return;
    }
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      task();
    });
  };

  const dispose = () => {
    if (rafId !== 0) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  };

  return { run, dispose };
}

function observeElementResize(target: HTMLElement, onResize: () => void) {
  let rafId = 0;
  const schedule = () => {
    if (rafId !== 0) {
      cancelAnimationFrame(rafId);
    }
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      onResize();
    });
  };

  let observer: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(() => {
      schedule();
    });
    observer.observe(target);
  }

  window.addEventListener('resize', schedule);
  schedule();

  return () => {
    if (rafId !== 0) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    observer?.disconnect();
    window.removeEventListener('resize', schedule);
  };
}

function appendSection(
  doc: Document,
  root: HTMLElement,
  title: string,
  subtitle: string,
) {
  const section = doc.createElement('section');
  section.className = 'demo-section';

  const heading = doc.createElement('div');
  heading.className = 'title';
  heading.dataset.showcaseTitle = 'true';
  heading.textContent = title;

  const sub = doc.createElement('p');
  sub.className = 'subtitle';
  sub.textContent = subtitle;

  const host = doc.createElement('div');
  host.className = 'pane-host';

  section.append(heading, sub, host);
  root.appendChild(section);

  return { section, host };
}

function appendMarker(doc: Document, section: HTMLElement, example: string) {
  const marker = doc.createElement('div');
  marker.hidden = true;
  marker.dataset.demoExample = example;
  section.appendChild(marker);
}

function mountSplitButtonRow(
  pane: Pane,
  args: {
    sizes: number[] | string;
    labels: string[];
    gutter?: number;
  },
) {
  const split = toSplitApi(pane.addBlade({
    view: 'split-layout',
    direction: 'row',
    sizes: args.sizes,
    gutter: args.gutter ?? 4,
    children: args.labels.map(() => 'leaf'),
  }));

  split.getSlots().forEach((slot, index) => {
    const childPane = createChildPane(split, slot);
    childPane.addBlade({
      view: 'sized-button',
      title: args.labels[index],
      units: 2,
    });
  });
}

function mountVisibleFirstSplit(host: HTMLElement) {
  const pane = new Pane({ container: host, title: 'First Split' });
  ensureRegistered(pane, { essentials: true });

  const row = toSplitApi(pane.addBlade({
    view: 'split-layout',
    direction: 'row',
    sizes: '1fr 1fr',
    gutter: 6,
    children: ['leaf', 'leaf'],
  }));
  const [left, right] = row.getSlots();

  const leftPane = createChildPane(row, left);
  leftPane.addBlade({ view: 'sized-button', title: 'button (3u)', units: 3 });

  const text = document.createElement('div');
  text.style.padding = '8px';
  text.style.color = '#888';
  text.style.fontSize = '10px';
  text.style.lineHeight = '1.5';
  text.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  text.innerHTML = 'Left: button (3u)<br>Right: Custom DOM with controllable height (3u)';
  right.appendChild(text);
}

function mountVisibleWidthGeometry(host: HTMLElement) {
  const pane = new Pane({ container: host, title: 'Width Geometry' });
  ensureRegistered(pane, { essentials: true });

  mountSplitButtonRow(pane, {
    sizes: 'equal',
    labels: ['Equal 1', 'Equal 2', 'Equal 3'],
  });
  mountSplitButtonRow(pane, {
    sizes: '2fr 1fr',
    labels: ['2fr', '1fr'],
  });
  mountSplitButtonRow(pane, {
    sizes: '20% 80%',
    labels: ['20%', '80%'],
  });
  mountSplitButtonRow(pane, {
    sizes: '1fr 2fr 2fr',
    labels: ['1fr', '2fr', '2fr'],
  });
}

function mountVisibleUnitsAndHeightFlow(host: HTMLElement, disposers: Array<() => void>) {
  const pane = new Pane({ container: host, title: 'Units And Height Flow' });
  ensureRegistered(pane, { essentials: true });

  const split = toSplitApi(pane.addBlade({
    view: 'split-layout',
    direction: 'row',
    sizes: '1fr 1fr',
    gutter: 6,
    interactive: true,
    children: ['leaf', 'leaf'],
  }));
  const [left, right] = split.getSlots();
  const palette = {
    cyan: '#22d3ee',
    amber: '#f59e0b',
    rose: '#fb7185',
  } as const;
  const state = {
    value: 64,
    thickness: 10,
    rounded: true,
    palette: 'cyan' as keyof typeof palette,
    detailLevel: 0.42,
    detailMode: 'beta',
  };

  let controlPane: Pane | null = null;
  if (left) {
    controlPane = new Pane({ container: left });
    tryWrapPane(split, controlPane);
    ensureRegistered(controlPane, { essentials: true });
    controlPane.addBinding(state, 'value', { min: 0, max: 100, label: 'Value' });
    controlPane.addBinding(state, 'thickness', { min: 4, max: 20, step: 1, label: 'Thickness' });
    const folder = controlPane.addFolder({
      title: 'Details',
      expanded: false,
    }) as unknown as FolderLike;
    folder.addBinding(state, 'rounded', { label: 'Rounded' });
    folder.addBinding(state, 'palette', {
      label: 'Accent',
      options: { Cyan: 'cyan', Amber: 'amber', Rose: 'rose' },
    });
    folder.addBinding(state, 'detailLevel', {
      min: 0,
      max: 1,
      label: 'Level',
    });
    folder.addBinding(state, 'detailMode', {
      label: 'Mode',
      options: { Alpha: 'alpha', Beta: 'beta', Gamma: 'gamma' },
    });
  }

  let gaugeBox: HTMLElement | null = null;
  if (right) {
    gaugeBox = mountDomUnits(right, 4);
  }

  const render = () => {
    if (!gaugeBox) {
      return;
    }
    renderDonutGaugeSvg(gaugeBox, state.value, {
      color: palette[state.palette],
      thickness: state.thickness,
      rounded: state.rounded,
    });
  };

  const schedule = createRafScheduler(render);
  if (gaugeBox) {
    const stopResize = observeElementResize(gaugeBox, schedule.run);
    disposers.push(() => {
      stopResize();
      schedule.dispose();
    });
  }
  schedule.run();
  try {
    controlPane?.on('change', schedule.run);
  } catch {}
}

function mountVisibleControlSemantics(host: HTMLElement) {
  const pane = new Pane({ container: host, title: 'Control Semantics' });
  ensureRegistered(pane, { essentials: true });

  const state = { compact: true, armed: false, a: 50, b: 24 };

  const buttonRow = toSplitApi(pane.addBlade({
    view: 'split-layout',
    direction: 'row',
    sizes: '1fr 1fr',
    children: ['leaf', 'leaf'],
  }));
  const [toggleSlot, armedSlot] = buttonRow.getSlots();

  if (toggleSlot) {
    const togglePane = createChildPane(buttonRow, toggleSlot);
    const toggleApi = togglePane.addBinding(state, 'compact', {
      view: 'boolean-button',
      units: 2,
      content: {
        text: 'Compact Sliders\nOff',
        icon: ICONS.sliders,
      },
      contentOn: {
        text: 'Compact Sliders\nOn',
      },
    });
    toggleApi.on('change', () => {
      requestAnimationFrame(renderPreview);
    });
  }

  if (armedSlot) {
    const armedPane = createChildPane(buttonRow, armedSlot);
    armedPane.addBinding(state, 'armed', {
      view: 'boolean-button',
      units: 2,
      content: {
        text: 'Armed',
        icon: ICONS.power,
      },
      contentOn: {
        text: 'Armed',
      },
    });
  }

  const fullRow = toSplitApi(pane.addBlade({
    view: 'split-layout',
    direction: 'row',
    children: ['leaf'],
  }));
  const [fullSlot] = fullRow.getSlots();
  if (fullSlot) {
    const fullPane = createChildPane(fullRow, fullSlot);
    fullPane.addBlade({
      view: 'sized-button',
      units: 3,
      content: {
        text: 'Monitor\nGraph',
        icon: ICONS.graph,
      },
    });
  }

  pane.addButton({ title: 'Native Full-Width Button' });

  let previewApi: SplitApi | null = null;
  let previewPanes: Pane[] = [];

  const clearPreview = () => {
    previewPanes.forEach((child) => {
      try {
        child.dispose();
      } catch {}
    });
    previewPanes = [];
    if (previewApi) {
      try {
        (pane as unknown as { remove: (api: object) => void }).remove(previewApi as unknown as object);
      } catch {}
      previewApi = null;
    }
  };

  function renderPreview() {
    clearPreview();
    const api = toSplitApi(pane.addBlade({
      view: 'split-layout',
      direction: 'row',
      sizes: '1fr 1fr',
      compactSliders: state.compact,
      children: ['leaf', 'leaf'],
    }));
    previewApi = api;
    const [left, right] = api.getSlots();
    const leftPane = createChildPane(api, left, { essentials: true });
    const rightPane = createChildPane(api, right, { essentials: true });
    leftPane.addBinding(state, 'a', { min: 0, max: 100, label: 'Left Value' });
    rightPane.addBinding(state, 'b', { min: 0, max: 100, label: 'Right Value' });
    previewPanes.push(leftPane, rightPane);
  }

  renderPreview();
}

function mountVisibleComposingLayouts(host: HTMLElement) {
  const pane = new Pane({ container: host, title: 'Composing Layouts' });
  ensureRegistered(pane, { essentials: true });

  const c1 = toSplitApi(pane.addBlade({
    view: 'split-layout',
    direction: 'row',
    sizes: [66, 33],
    children: ['alpha', 'beta'],
  }));

  const c2 = toSplitApi(pane.addBlade({
    view: 'split-layout',
    direction: 'row',
    sizes: 'equal',
    children: ['alpha', 'beta', 'gamma'],
  }));

  const c3 = toSplitApi(pane.addBlade({
    view: 'split-layout',
    direction: 'row',
    sizes: '1fr 2fr',
    children: [
      {
        view: 'split-layout',
        direction: 'column',
        compactSliders: false,
        children: ['alpha', 'alpha', 'alpha'],
      },
      'gamma',
    ],
  }));

  requestAnimationFrame(() => {
    const [c1Left, c1Right] = c1.getSlots();
    if (c1Left) {
      const leftPane = new Pane({ container: c1Left });
      tryWrapPane(c1, leftPane);
      ensureRegistered(leftPane);
      leftPane.addBlade({ view: 'sized-button', title: 'Run\nAction', units: 3 });
    }
    if (c1Right) {
      const rightPane = new Pane({ container: c1Right });
      tryWrapPane(c1, rightPane);
      ensureRegistered(rightPane, { essentials: true });
      rightPane.addBinding({ v: 42 }, 'v', { min: 0, max: 100, label: 'Level' });
      rightPane.addBinding({ on: true }, 'on', { label: 'Enabled' });
      rightPane.addBinding({ mode: 'a' }, 'mode', { options: { Alpha: 'a', Beta: 'b', Gamma: 'g' } });
    }

    const [c2Alpha, c2Beta, c2Gamma] = c2.getSlots();
    if (c2Alpha) {
      const alphaPane = new Pane({ container: c2Alpha });
      tryWrapPane(c2, alphaPane);
      ensureRegistered(alphaPane);
      alphaPane.addButton({ title: 'Action' });
      alphaPane.addBinding({ text: 'hello' }, 'text');
    }
    if (c2Beta) {
      const betaPane = new Pane({ container: c2Beta });
      tryWrapPane(c2, betaPane);
      ensureRegistered(betaPane);
      betaPane.addBinding({ n: 3.14 }, 'n', { min: 0, max: 10 });
      betaPane.addBinding({ palette: 'cyan' }, 'palette', {
        label: 'Accent',
        options: { Cyan: 'cyan', Amber: 'amber', Rose: 'rose' },
      });
    }
    if (c2Gamma) {
      const gammaPane = new Pane({ container: c2Gamma });
      tryWrapPane(c2, gammaPane);
      ensureRegistered(gammaPane, { essentials: true });
      gammaPane.addBlade({
        view: 'buttongrid',
        size: [2, 2],
        cells: (x: number, y: number) => ({
          title: String.fromCharCode('A'.charCodeAt(0) + (y * 2 + x)),
        }),
      });
    }

    const leftSlots = c3.getSlotsByCategory?.('alpha') ?? [];
    const rightSlots = c3.getSlotsByCategory?.('gamma') ?? [];

    if (leftSlots[0]) {
      const pane0 = new Pane({ container: leftSlots[0] });
      ensureRegistered(pane0);
      pane0.addBinding({ p: { x: 0.3, y: 0.7 } }, 'p', {
        x: { min: 0, max: 1 },
        y: { min: 0, max: 1 },
        label: '',
      });
    }
    if (leftSlots[1]) {
      const pane1 = new Pane({ container: leftSlots[1] });
      ensureRegistered(pane1, { essentials: true });
      const folder = pane1.addFolder({ title: 'Details', expanded: false }) as unknown as FolderLike;
      folder.addBinding({ level: 0.5 }, 'level', { min: 0, max: 1, label: 'Level' });
      folder.addBinding({ mode: 'A' }, 'mode', {
        options: { A: 'A', B: 'B', C: 'C' },
        label: 'Mode',
      });
      folder.addButton?.({ title: 'Apply' });
    }
    if (leftSlots[2]) {
      const pane2 = new Pane({ container: leftSlots[2] });
      ensureRegistered(pane2);
      pane2.addBinding({ volume: 50 }, 'volume', { min: 0, max: 100, label: 'Volume' });
      pane2.addBinding({ txt: 'note' }, 'txt', { label: '' });
    }

    if (rightSlots[0]) {
      const rightPane = new Pane({ container: rightSlots[0] });
      tryWrapPane(c3, rightPane);
      ensureRegistered(rightPane, { essentials: true });
      rightPane.addBinding({ p: { x: 0.1, y: 0.5, z: 0.9 } }, 'p', {
        x: { min: 0, max: 1 },
        y: { min: 0, max: 1 },
        z: { min: 0, max: 1 },
      });
      rightPane.addBlade({ view: 'cubicbezier', value: [0.5, 0.2, 0.5, 1] });

      const subSplit = toSplitApi(rightPane.addBlade({
        view: 'split-layout',
        direction: 'row',
        sizes: '80px 1fr',
        children: ['left', 'right'],
      }));
      const [buttonSlot, graphSlot] = subSplit.getSlots();

      if (buttonSlot) {
        const buttonPane = new Pane({ container: buttonSlot });
        tryWrapPane(c3, buttonPane);
        ensureRegistered(buttonPane);
        buttonPane.addBlade({ view: 'sized-button', title: 'Monitor\nGraph', units: 2 });
      }

      if (graphSlot) {
        const graphPane = new Pane({ container: graphSlot });
        tryWrapPane(c3, graphPane);
        ensureRegistered(graphPane);
        const params = { wave: 0 };
        graphPane.addBinding(params, 'wave', {
          view: 'graph',
          readonly: true,
          min: -1,
          max: 1,
        });

        let time = 0;
        const interval = setInterval(() => {
          time += 0.1;
          params.wave = Math.sin(time);
        }, 50);
        window.addEventListener('beforeunload', () => clearInterval(interval), { once: true });
      }
    }
  });
}

function createCaptureHost(
  doc: Document,
  root: HTMLElement,
  exportTargets: Map<string, HTMLElement>,
  key: string,
) {
  const host = doc.createElement('div');
  host.className = 'pane-host';
  host.dataset.showcaseExport = key;
  exportTargets.set(key, host);
  root.appendChild(host);
  return host;
}

function mountCaptureFirstSplit(host: HTMLElement) {
  const pane = new Pane({ container: host, title: 'First Split' });
  ensureRegistered(pane, { essentials: true });

  const split = toSplitApi(pane.addBlade({
    view: 'split-layout',
    direction: 'row',
    sizes: '1fr 1fr',
    gutter: 6,
    children: ['leaf', 'leaf'],
  }));

  const [left, right] = split.getSlots();
  if (left) {
    const child = createChildPane(split, left);
    child.addBlade({ view: 'sized-button', title: 'Button\n3u', units: 3 });
  }
  if (right) {
    mountDomUnits(right, 3, (domHost) => {
      domHost.style.padding = '14px';
      domHost.style.textAlign = 'center';
      domHost.innerHTML = '<strong>Custom DOM</strong><br>Mounted through a split slot with a declared 3u span.';
    });
  }
}

function mountCaptureWidthGeometry(host: HTMLElement) {
  const pane = new Pane({ container: host, title: 'Width Geometry' });
  ensureRegistered(pane, { essentials: true });

  mountSplitButtonRow(pane, {
    sizes: 'equal',
    labels: ['Equal 1', 'Equal 2', 'Equal 3'],
  });
  mountSplitButtonRow(pane, {
    sizes: '2fr 1fr',
    labels: ['2fr', '1fr'],
  });
  mountSplitButtonRow(pane, {
    sizes: '20% 80%',
    labels: ['20%', '80%'],
  });
  mountSplitButtonRow(pane, {
    sizes: '1fr 2fr 2fr',
    labels: ['1fr', '2fr', '2fr'],
  });
}

function mountCaptureUnitsAndHeightFlow(host: HTMLElement, disposers: Array<() => void>) {
  const pane = new Pane({ container: host, title: 'Units And Height Flow' });
  ensureRegistered(pane, { essentials: true });

  const split = toSplitApi(pane.addBlade({
    view: 'split-layout',
    direction: 'row',
    sizes: '1fr 1fr',
    gutter: 6,
    children: ['leaf', 'leaf'],
  }));

  const palette = {
    cyan: '#22d3ee',
    amber: '#f59e0b',
    rose: '#fb7185',
  } as const;
  const state = {
    value: 64,
    thickness: 10,
    rounded: true,
    palette: 'cyan' as keyof typeof palette,
    detailLevel: 0.42,
    detailMode: 'beta',
  };

  const [left, right] = split.getSlots();
  let controls: Pane | null = null;
  if (left) {
    controls = createChildPane(split, left, { essentials: true });
    controls.addBinding(state, 'value', { min: 0, max: 100, label: 'Value' });
    controls.addBinding(state, 'thickness', { min: 4, max: 20, step: 1, label: 'Thickness' });
    const folder = controls.addFolder({
      title: 'Details',
      expanded: true,
    }) as unknown as FolderLike;
    folder.addBinding(state, 'rounded', { label: 'Rounded' });
    folder.addBinding(state, 'palette', {
      label: 'Accent',
      options: { Cyan: 'cyan', Amber: 'amber', Rose: 'rose' },
    });
    folder.addBinding(state, 'detailLevel', {
      min: 0,
      max: 1,
      label: 'Level',
    });
    folder.addBinding(state, 'detailMode', {
      label: 'Mode',
      options: { Alpha: 'alpha', Beta: 'beta', Gamma: 'gamma' },
    });
  }

  let gaugeHost: HTMLElement | null = null;
  if (right) {
    gaugeHost = mountDomUnits(right, 4, (domHost) => {
      domHost.classList.add('showcase-gauge-host');
    });
  }

  if (!gaugeHost) {
    return;
  }

  const render = createRafScheduler(() => {
    renderDonutGaugeSvg(gaugeHost!, state.value, {
      color: palette[state.palette],
      thickness: state.thickness,
      rounded: state.rounded,
    });
  });
  render.run();
  const stopResize = observeElementResize(gaugeHost, render.run);
  disposers.push(() => {
    stopResize();
    render.dispose();
  });
  try {
    controls?.on('change', render.run);
  } catch {}
}

function mountCaptureBooleanButton(host: HTMLElement, pressed: boolean) {
  const pane = new Pane({ container: host, title: 'Boolean Button' });
  ensureRegistered(pane);

  const state = { enabled: pressed };
  pane.addBinding(state, 'enabled', {
    view: 'boolean-button',
    units: 2,
    content: {
      text: 'System\nStandby',
      icon: ICONS.power,
    },
    contentOn: {
      text: 'System\nArmed',
    },
  });
  pane.addBinding(state, 'enabled', { label: 'Native binding' });
}

function mountCaptureSizedActions(host: HTMLElement) {
  const pane = new Pane({ container: host, title: 'Sized Button' });
  ensureRegistered(pane);

  pane.addBlade({
    view: 'sized-button',
    units: 2,
    content: {
      text: 'Run\nAction',
      icon: ICONS.power,
    },
  });
  pane.addBlade({
    view: 'sized-button',
    units: 3,
    content: {
      text: 'Monitor\nGraph',
      icon: ICONS.graph,
    },
  });
}

function mountCaptureCompactSliders(host: HTMLElement, compact: boolean) {
  const pane = new Pane({ container: host, title: 'Compact Sliders' });
  ensureRegistered(pane, { essentials: true });

  const state = { compact, leftValue: 50, rightValue: 24 };
  pane.addBinding(state, 'compact', {
    view: 'boolean-button',
    units: 2,
    content: {
      text: 'Compact Sliders\nOff',
      icon: ICONS.sliders,
    },
    contentOn: {
      text: 'Compact Sliders\nOn',
    },
  });

  const preview = toSplitApi(pane.addBlade({
    view: 'split-layout',
    direction: 'row',
    sizes: '1fr 1fr',
    compactSliders: state.compact,
    children: ['leaf', 'leaf'],
  }));

  const [left, right] = preview.getSlots();
  if (left) {
    const child = createChildPane(preview, left, { essentials: true });
    child.addBinding(state, 'leftValue', { min: 0, max: 100, label: 'Left Value' });
  }
  if (right) {
    const child = createChildPane(preview, right, { essentials: true });
    child.addBinding(state, 'rightValue', { min: 0, max: 100, label: 'Right Value' });
  }
}

function mountCaptureComposingLayouts(host: HTMLElement) {
  const pane = new Pane({ container: host, title: 'Composing Layouts' });
  ensureRegistered(pane, { essentials: true });

  const root = toSplitApi(pane.addBlade({
    view: 'split-layout',
    direction: 'row',
    sizes: '1fr 1fr',
    children: [
      {
        view: 'split-layout',
        direction: 'column',
        units: 3,
        children: ['action', 'details'],
      },
      'visual',
    ],
  }));

  const actionSlot = root.getSlotsByCategory?.('action')?.[0];
  if (actionSlot) {
    const actionPane = createChildPane(root, actionSlot);
    actionPane.addBlade({
      view: 'sized-button',
      units: 2,
      content: {
        text: 'Run\nAction',
        icon: ICONS.graph,
      },
    });
  }

  const detailsSlot = root.getSlotsByCategory?.('details')?.[0];
  if (detailsSlot) {
    const detailsPane = createChildPane(root, detailsSlot, { essentials: true });
    const folder = detailsPane.addFolder({ title: 'Details', expanded: true }) as unknown as FolderLike;
    folder.addBinding({ level: 0.42 }, 'level', { min: 0, max: 1, label: 'Level' });
    folder.addBinding({ mode: 'beta' }, 'mode', {
      label: 'Mode',
      options: { Alpha: 'alpha', Beta: 'beta', Gamma: 'gamma' },
    });
    folder.addButton?.({ title: 'Apply' });
  }

  const visualSlot = root.getSlotsByCategory?.('visual')?.[0];
  if (visualSlot) {
    const gaugeHost = mountDomUnits(visualSlot, 4, (domHost) => {
      domHost.classList.add('showcase-gauge-host');
    });
    renderDonutGaugeSvg(gaugeHost, 78, {
      color: '#22d3ee',
      thickness: 10,
      rounded: true,
    });
  }
}

function mountCaptureTargets(
  doc: Document,
  root: HTMLElement,
  exportTargets: Map<string, HTMLElement>,
  disposers: Array<() => void>,
) {
  const captureRoot = doc.createElement('div');
  captureRoot.className = 'capture-root';
  root.appendChild(captureRoot);

  mountCaptureFirstSplit(createCaptureHost(doc, captureRoot, exportTargets, 'split-first-row'));
  mountCaptureWidthGeometry(createCaptureHost(doc, captureRoot, exportTargets, 'split-size-expressions'));
  mountCaptureUnitsAndHeightFlow(createCaptureHost(doc, captureRoot, exportTargets, 'split-mixed-dom'), disposers);
  mountCaptureBooleanButton(createCaptureHost(doc, captureRoot, exportTargets, 'button-boolean-off'), false);
  mountCaptureBooleanButton(createCaptureHost(doc, captureRoot, exportTargets, 'button-boolean-on'), true);
  mountCaptureSizedActions(createCaptureHost(doc, captureRoot, exportTargets, 'button-sized-actions'));
  mountCaptureCompactSliders(createCaptureHost(doc, captureRoot, exportTargets, 'compact-sliders-off'), false);
  mountCaptureCompactSliders(createCaptureHost(doc, captureRoot, exportTargets, 'compact-sliders-on'), true);
  mountCaptureComposingLayouts(createCaptureHost(doc, captureRoot, exportTargets, 'composing-layouts'));
}

function mountCaptureControls(
  doc: Document,
  root: HTMLElement,
  exportTargets: Map<string, HTMLElement>,
  options: ShowcaseMountOptions,
) {
  const bar = doc.createElement('div');
  bar.className = 'capture-bar';

  const button = doc.createElement('button');
  button.type = 'button';
  button.textContent = 'Export README SVGs';
  button.dataset.captureButton = 'true';

  const status = doc.createElement('span');
  status.className = 'capture-status';
  status.dataset.captureStatus = 'true';
  status.textContent = 'Ready';

  button.addEventListener('click', async () => {
    if (!options.writeCapturedSvgs) {
      status.textContent = 'No writer configured';
      return;
    }
    button.disabled = true;
    status.textContent = 'Writing...';
    try {
      const result = await options.writeCapturedSvgs(collectShowcaseSvgExports(doc, exportTargets));
      const count = result?.count ?? exportTargets.size;
      status.textContent = `Wrote ${count} SVGs`;
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : 'Export failed';
    } finally {
      button.disabled = false;
    }
  });

  bar.append(button, status);
  root.appendChild(bar);
}

export function mountShowcaseDemo(
  doc: Document,
  root: HTMLElement,
  options: ShowcaseMountOptions = {},
): ShowcaseMountResult {
  root.innerHTML = '';
  const exportTargets = new Map<string, HTMLElement>();
  const disposers: Array<() => void> = [];

  if (options.captureMode) {
    mountCaptureControls(doc, root, exportTargets, options);
  }

  const first = appendSection(
    doc,
    root,
    '1 First Split',
    'One split root creates slots. Each slot can host a wrapped child pane or plain DOM.',
  );
  mountVisibleFirstSplit(first.host);

  const sizes = appendSection(
    doc,
    root,
    '2 Width Geometry',
    'All row widths follow one geometry model, so equal tracks, ratios, percentages, and pixels align naturally.',
  );
  mountVisibleWidthGeometry(sizes.host);

  const mixed = appendSection(
    doc,
    root,
    '3 Units And Height Flow',
    'Width is split horizontally; height flows through units. Rows take the max child, columns sum visible children.',
  );
  mountVisibleUnitsAndHeightFlow(mixed.host, disposers);

  const buttons = appendSection(
    doc,
    root,
    '4 Control Semantics',
    'Boolean buttons keep boolean logic, sized buttons stay stateless, and compact sliders only change layout treatment.',
  );
  appendMarker(doc, buttons.section, 'boolean-button');
  appendMarker(doc, buttons.section, 'compact-sliders');
  mountVisibleControlSemantics(buttons.host);

  const composing = appendSection(
    doc,
    root,
    '5 Composing Layouts',
    'Semantic slots, nested rows and columns, adaptive folders, and mixed controls all stay inside the same layout contract.',
  );
  mountVisibleComposingLayouts(composing.host);

  if (options.captureMode) {
    mountCaptureTargets(doc, root, exportTargets, disposers);
  }

  return {
    exportTargets,
    destroy: () => {
      while (disposers.length > 0) {
        const dispose = disposers.pop();
        try {
          dispose?.();
        } catch {}
      }
    },
  };
}
