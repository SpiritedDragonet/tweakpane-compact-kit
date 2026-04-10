import * as Essentials from '@tweakpane/plugin-essentials';
import { Pane } from 'tweakpane';

import { setSplitDomUnits } from '../core/split/domUnitState';
import { createDonutGaugeSvg } from './donutGaugeSvg';
import { collectShowcaseSvgExports, type ShowcaseSvgExport } from './exportPaneSvg';

type SplitApi = {
  getSlots(): HTMLElement[];
  getSlotsByCategory?: (category: string) => HTMLElement[];
  wrapPane?: (pane: Pane) => void;
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

export type ShowcasePluginBundle = Parameters<Pane['registerPlugin']>[0];

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

let activePluginBundle: ShowcasePluginBundle | null = null;

function ensureRegistered(pane: Pane, options?: { essentials?: boolean }) {
  if (!activePluginBundle) {
    throw new Error('Missing showcase plugin bundle.');
  }

  pane.registerPlugin(activePluginBundle);
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

function mountDomUnits(slot: HTMLElement, units: number, render?: (box: HTMLElement) => void) {
  const box = document.createElement('div');
  box.className = 'tp-demo-domleaf';
  box.style.display = 'grid';
  box.style.placeItems = 'center';
  box.style.fontSize = '12px';
  slot.appendChild(box);
  setDomUnits(box, units);
  if (render) {
    render(box);
  } else {
    box.textContent = `${units}u DOM (not a Tweakpane control)`;
  }
  return box;
}

function setDomUnits(el: HTMLElement, units: number) {
  setSplitDomUnits(el, units);
}

function applyDemoCardChrome(
  box: HTMLElement,
  options: {
    dashed?: boolean;
    align?: 'center' | 'start';
  } = {},
) {
  box.style.alignContent = options.align === 'start' ? 'start' : 'center';
  box.style.background = 'rgba(17, 25, 39, 0.42)';
  box.style.border = options.dashed ? '1px dashed #5b6677' : '1px solid #2a313d';
  box.style.borderRadius = '6px';
  box.style.boxSizing = 'border-box';
  box.style.color = '#b8c2cf';
  box.style.gap = '6px';
  box.style.justifyItems = 'center';
  box.style.padding = '12px';
  box.style.textAlign = 'center';
  box.style.width = '100%';
}

function appendCardText(
  box: HTMLElement,
  title: string,
  lines: string[],
  options: {
    caption?: string;
  } = {},
) {
  const heading = document.createElement('div');
  heading.style.color = '#e6edf6';
  heading.style.fontSize = '12px';
  heading.style.fontWeight = '600';
  heading.style.lineHeight = '14px';
  heading.textContent = title;

  const body = document.createElement('div');
  body.style.fontSize = '11px';
  body.style.lineHeight = '14px';
  body.style.maxWidth = '100%';
  body.style.whiteSpace = 'pre-line';
  body.textContent = lines.join('\n');

  box.append(heading, body);

  if (options.caption) {
    const caption = document.createElement('div');
    caption.style.color = '#8fa1b8';
    caption.style.fontSize = '10px';
    caption.style.lineHeight = '11px';
    caption.textContent = options.caption;
    box.appendChild(caption);
  }
}

function mountDeclaredSpanDom(
  slot: HTMLElement,
  units: number,
  options: {
    title: string;
    lines: string[];
    caption?: string;
    dashed?: boolean;
  },
) {
  const box = mountDomUnits(slot, units, (domHost) => {
    applyDemoCardChrome(domHost, { dashed: options.dashed });
    appendCardText(domHost, options.title, options.lines, { caption: options.caption });
  });
  setDomUnits(box, units);
  return box;
}

function mountUnitsGaugeHost(
  slot: HTMLElement,
  state: {
    units: number;
    value: number;
    thickness: number;
    rounded: boolean;
    color: string;
  },
) {
  const doc = slot.ownerDocument;
  let renderGauge = () => {};

  const box = mountDomUnits(slot, state.units, (domHost) => {
    applyDemoCardChrome(domHost, { dashed: true });
    domHost.style.display = 'flex';
    domHost.style.alignItems = 'center';
    domHost.style.justifyContent = 'center';
    domHost.style.padding = '10px 12px';

    const gaugeHost = doc.createElement('div');
    gaugeHost.style.display = 'flex';
    gaugeHost.style.alignItems = 'center';
    gaugeHost.style.justifyContent = 'center';
    gaugeHost.style.height = '100%';
    gaugeHost.style.width = '100%';

    renderGauge = () => {
      const gaugeSize = Math.max(52, Math.min(96, state.units * 18));
      gaugeHost.replaceChildren(createDonutGaugeSvg(doc, {
        width: gaugeSize,
        height: gaugeSize,
        value: state.value,
        thickness: state.thickness,
        rounded: state.rounded,
        color: state.color,
      }));
    };

    renderGauge();
    domHost.appendChild(gaugeHost);
  });

  setDomUnits(box, state.units);
  return {
    box,
    renderGauge,
    setUnits: (units: number) => {
      setDomUnits(box, units);
      renderGauge();
    },
  };
}

function mountMeasuredFallbackDom(
  slot: HTMLElement,
  options: {
    title: string;
    lines: string[];
    chip?: string;
    minHeight?: string;
  },
) {
  const box = document.createElement('div');
  box.className = 'tp-demo-domleaf';
  applyDemoCardChrome(box, { align: 'start' });
  box.style.display = 'grid';
  box.style.justifyItems = 'stretch';
  box.style.minHeight = options.minHeight ?? '';
  box.style.padding = '12px';
  box.style.textAlign = 'left';
  box.style.placeItems = 'unset';
  slot.appendChild(box);

  const heading = document.createElement('div');
  heading.style.color = '#e6edf6';
  heading.style.fontSize = '12px';
  heading.style.fontWeight = '600';
  heading.style.lineHeight = '14px';
  heading.textContent = options.title;

  const body = document.createElement('div');
  body.style.fontSize = '11px';
  body.style.lineHeight = '14px';
  body.style.whiteSpace = 'pre-line';
  body.textContent = options.lines.join('\n');

  box.append(heading, body);

  if (options.chip) {
    const chip = document.createElement('div');
    chip.style.alignSelf = 'start';
    chip.style.background = 'rgba(34, 211, 238, 0.12)';
    chip.style.border = '1px solid rgba(34, 211, 238, 0.35)';
    chip.style.borderRadius = '999px';
    chip.style.color = '#a5f3fc';
    chip.style.fontSize = '10px';
    chip.style.padding = '4px 8px';
    chip.textContent = options.chip;
    box.appendChild(chip);
  }

  return box;
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
  leftPane.addBlade({ view: 'sized-button', title: 'Button\n3u', units: 3 });

  mountDeclaredSpanDom(right, 3, {
    title: 'Plain DOM',
    lines: ['Direct slot mount.'],
  });
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
    sizes: '1fr 3fr 20%',
    labels: ['1fr', '3fr', '20%'],
  });
}

function mountVisibleUnitsAndHeightFlow(
  host: HTMLElement,
  options: {
    detailsExpanded?: boolean;
  } = {},
) {
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
  const state = {
    units: 4,
    value: 64,
    thickness: 10,
    rounded: true,
    color: '#22d3ee',
  };
  const gauge = right ? mountUnitsGaugeHost(right, state) : null;

  if (left) {
    const controlPane = new Pane({ container: left });
    tryWrapPane(split, controlPane);
    ensureRegistered(controlPane, { essentials: true });
    controlPane.addBinding(state, 'value', { min: 0, max: 100, label: 'Value' });
    controlPane.addBinding(state, 'thickness', { min: 4, max: 20, step: 1, label: 'Thickness' });
    const folder = controlPane.addFolder({
      title: 'Details',
      expanded: options.detailsExpanded === true,
    }) as unknown as FolderLike;
    folder.addBinding(state, 'rounded', { label: 'Rounded' });
    folder.addBinding(state, 'color', { label: '' });
    folder.addBinding(state, 'units', {
      min: 2,
      max: 6,
      step: 1,
      label: 'Units',
    });
    if (gauge) {
      controlPane.on('change', () => {
        gauge.setUnits(state.units);
      });
    }
  }
}

function mountVisibleCustomDom(host: HTMLElement) {
  const pane = new Pane({ container: host, title: 'Custom DOM' });
  ensureRegistered(pane, { essentials: true });

  const split = toSplitApi(pane.addBlade({
    view: 'split-layout',
    direction: 'row',
    sizes: '1fr 1fr',
    gutter: 6,
    children: ['declared', 'measured'],
  }));
  const [declared, measured] = split.getSlots();

  if (declared) {
    mountDeclaredSpanDom(declared, 4, {
      title: 'Declared Span DOM',
      lines: ['Explicit 4u.'],
    });
  }

  if (measured) {
    mountMeasuredFallbackDom(measured, {
      title: 'Measured Fallback DOM',
      lines: ['Measured from content.', 'Rounds up.'],
      minHeight: '94px',
    });
  }
}

function mountButtonsOverview(host: HTMLElement) {
  const pane = new Pane({ container: host, title: 'Buttons Overview' });
  ensureRegistered(pane);

  const state = {
    textOnly: false,
    iconOnly: false,
    mixed: false,
  };

  const row = toSplitApi(pane.addBlade({
    view: 'split-layout',
    direction: 'row',
    sizes: 'equal',
    gutter: 6,
    children: ['text', 'icon', 'mixed'],
  }));

  row.getSlots().forEach((slot, index) => {
    const child = createChildPane(row, slot);
    if (index === 0) {
      child.addBinding(state, 'textOnly', {
        view: 'boolean-button',
        units: 2,
        content: {
          text: 'Text Only',
        },
        contentOn: {
          text: 'Text Armed',
        },
      });
      return;
    }

    if (index === 1) {
      child.addBinding(state, 'iconOnly', {
        view: 'boolean-button',
        units: 2,
        content: {
          icon: ICONS.power,
        },
      });
      return;
    }

    child.addBinding(state, 'mixed', {
      view: 'boolean-button',
      units: 2,
      content: {
        text: 'Icon + Text',
        icon: ICONS.sliders,
      },
      contentOn: {
        text: 'Icon + Text',
      },
    });
  });

  pane.addBlade({
    view: 'sized-button',
    units: 3,
    iconSize: 22,
    content: {
      text: '3u Multiline\nResizable Icon',
      icon: ICONS.graph,
    },
  });
}

function mountButtonsBooleanOn(host: HTMLElement) {
  const pane = new Pane({ container: host, title: 'Boolean On State' });
  ensureRegistered(pane);

  const state = { armed: true };
  pane.addBinding(state, 'armed', {
    view: 'boolean-button',
    units: 2,
    content: {
      text: 'System\nIdle',
      icon: ICONS.power,
    },
    contentOn: {
      text: 'Signal\nLive',
      icon: ICONS.graph,
    },
  });
}

function mountVisibleButtons(host: HTMLElement) {
  mountButtonsOverview(host);
  mountButtonsBooleanOn(host);
}

function mountCompactSlidersCompare(host: HTMLElement) {
  const pane = new Pane({ container: host, title: 'Native Vs Compact' });
  ensureRegistered(pane, { essentials: true });

  const comparison = toSplitApi(pane.addBlade({
    view: 'split-layout',
    direction: 'row',
    sizes: '1fr 1fr',
    compactSliders: false,
    children: ['native', 'compact'],
  }));
  const [nativeSlot, compactSlot] = comparison.getSlots();

  if (nativeSlot) {
    const child = new Pane({ container: nativeSlot });
    ensureRegistered(child, { essentials: true });
    child.addBinding({ value: 50 }, 'value', { min: 0, max: 100, label: 'Native' });
  }

  if (compactSlot) {
    const hostPane = createChildPane(comparison, compactSlot, { essentials: true });
    const nested = toSplitApi(hostPane.addBlade({
      view: 'split-layout',
      direction: 'row',
      compactSliders: true,
      children: ['leaf'],
    }));
    const [nestedSlot] = nested.getSlots();
    if (nestedSlot) {
      const child = createChildPane(nested, nestedSlot, { essentials: true });
      child.addBinding({ value: 24 }, 'value', { min: 0, max: 100, label: 'Compact' });
    }
  }
}

function mountCompactWrappedLabels(host: HTMLElement) {
  const pane = new Pane({ container: host, title: 'Wrapped Labels' });
  ensureRegistered(pane, { essentials: true });

  const preview = toSplitApi(pane.addBlade({
    view: 'split-layout',
    direction: 'row',
    sizes: '1fr 1fr',
    children: ['left', 'right'],
  }));
  const [left, right] = preview.getSlots();
  if (left) {
    const child = createChildPane(preview, left, { essentials: true });
    child.addBinding({ mode: 'beta' }, 'mode', {
      label: 'Label',
      options: { Alpha: 'alpha', Beta: 'beta', Gamma: 'gamma' },
    });
  }
  if (right) {
    const child = createChildPane(preview, right, { essentials: true });
    child.addBinding({ mode: 'beta' }, 'mode', {
      options: { Alpha: 'alpha', Beta: 'beta', Gamma: 'gamma' },
    });
  }
}

function mountVisibleCompactSlidersAndLabels(host: HTMLElement) {
  mountCompactSlidersCompare(host);
  mountCompactWrappedLabels(host);
}

function mountVisibleComposingLayouts(host: HTMLElement, disposers: Array<() => void>) {
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
    compactSliders: false,
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
    betaPane.addBinding({ accent: '#22d3ee' }, 'accent', { label: '' });
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
    const pane0 = createChildPane(c3, leftSlots[0]);
    pane0.addBinding({ p: { x: 0.3, y: 0.7 } }, 'p', {
      x: { min: 0, max: 1 },
      y: { min: 0, max: 1 },
      label: '',
    });
  }
  if (leftSlots[1]) {
    const pane1 = createChildPane(c3, leftSlots[1], { essentials: true });
    const folder = pane1.addFolder({ title: 'Details', expanded: false }) as unknown as FolderLike;
    folder.addBinding({ level: 0.5 }, 'level', { min: 0, max: 1, label: 'Level' });
    folder.addBinding({ mode: 'A' }, 'mode', {
      options: { A: 'A', B: 'B', C: 'C' },
      label: 'Mode',
    });
    folder.addButton?.({ title: 'Apply' });
  }
  if (leftSlots[2]) {
    const pane2 = createChildPane(c3, leftSlots[2], { essentials: true });
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
      compactSliders: false,
      children: ['left', 'right'],
    }));
    const [buttonSlot, graphSlot] = subSplit.getSlots();

    if (buttonSlot) {
      const buttonPane = createChildPane(subSplit, buttonSlot);
      buttonPane.addBlade({ view: 'sized-button', title: 'Monitor\nGraph', units: 2 });
      buttonPane.addBinding({ on: true }, 'on', {
        view: 'boolean-button',
        units: 1,
        content: { text: 'On' },
      });
    }

    if (graphSlot) {
      const graphPane = createChildPane(subSplit, graphSlot);
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
      disposers.push(() => clearInterval(interval));
    }
  }
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

function mountCaptureTargets(
  doc: Document,
  root: HTMLElement,
  exportTargets: Map<string, HTMLElement>,
  disposers: Array<() => void>,
) {
  const captureRoot = doc.createElement('div');
  captureRoot.className = 'capture-root';
  root.appendChild(captureRoot);

  mountVisibleFirstSplit(createCaptureHost(doc, captureRoot, exportTargets, 'split-first-row'));
  mountVisibleWidthGeometry(createCaptureHost(doc, captureRoot, exportTargets, 'split-width-geometry'));
  mountVisibleCustomDom(createCaptureHost(doc, captureRoot, exportTargets, 'split-custom-dom'));
  mountVisibleUnitsAndHeightFlow(
    createCaptureHost(doc, captureRoot, exportTargets, 'split-units-height-flow'),
    { detailsExpanded: true },
  );
  mountButtonsOverview(createCaptureHost(doc, captureRoot, exportTargets, 'buttons-overview'));
  mountButtonsBooleanOn(createCaptureHost(doc, captureRoot, exportTargets, 'buttons-boolean-on'));
  mountCompactSlidersCompare(createCaptureHost(doc, captureRoot, exportTargets, 'compact-sliders-compare'));
  mountCompactWrappedLabels(createCaptureHost(doc, captureRoot, exportTargets, 'compact-sliders-split-leaf'));
  mountVisibleComposingLayouts(createCaptureHost(doc, captureRoot, exportTargets, 'composing-layouts'), disposers);
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

export function mountShowcaseDemoWithBundle(
  pluginBundle: ShowcasePluginBundle,
  doc: Document,
  root: HTMLElement,
  options: ShowcaseMountOptions = {},
): ShowcaseMountResult {
  const previousPluginBundle = activePluginBundle;
  activePluginBundle = pluginBundle;
  try {
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
      'One split root creates slots for panes or plain DOM.',
    );
    mountVisibleFirstSplit(first.host);

    const sizes = appendSection(
      doc,
      root,
      '2 Width Geometry',
      'One width model handles equal, fr, %, and mixed rows.',
    );
    mountVisibleWidthGeometry(sizes.host);

    const customDom = appendSection(
      doc,
      root,
      '3 Custom DOM',
      'Declare DOM spans when known; measure only as fallback.',
    );
    mountVisibleCustomDom(customDom.host);

    const mixed = appendSection(
      doc,
      root,
      '4 Units And Height Flow',
      'Rows use the tallest child. Columns sum visible units.',
    );
    mountVisibleUnitsAndHeightFlow(mixed.host);

    const buttons = appendSection(
      doc,
      root,
      '5 Buttons',
      'Buttons share content; boolean and action semantics stay separate.',
    );
    mountVisibleButtons(buttons.host);

    const sliders = appendSection(
      doc,
      root,
      '6 Compact Sliders And Labels',
      'Native and compact sliders differ only in layout treatment.',
    );
    mountVisibleCompactSlidersAndLabels(sliders.host);

    const composing = appendSection(
      doc,
      root,
      '7 Composing Layouts',
      'Nested rows, columns, DOM, and controls keep one contract.',
    );
    mountVisibleComposingLayouts(composing.host, disposers);

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
  } finally {
    activePluginBundle = previousPluginBundle;
  }
}
