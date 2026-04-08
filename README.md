# Tweakpane Compact Kit

## Overview

Compact extension kit for Tweakpane v4: split layouts, button views, and
compact slider treatment that stay aligned with native pane geometry.

The kit is easiest to learn as one short guided tour. The sections below follow
the same order as the live demo, so the numbered chapter you see in the page is
the same chapter you can read here in the README.

## Install

```bash
npm install tweakpane tweakpane-compact-kit
```

Peer dependency: `tweakpane` v4.

## Quick Start

```ts
import { Pane } from 'tweakpane';
import { CompactKitBundle } from 'tweakpane-compact-kit';

const pane = new Pane();
pane.registerPlugin(CompactKitBundle);

const split = pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: '1fr 1fr',
  children: ['left', 'right'],
});

const [left, right] = split.getSlots();
```

When you mount a child pane into a split slot, register `CompactKitBundle` on
the child pane too. `split.wrapPane(pane)` is the preferred path when you want
hidden-label rows and nested split roots to inherit the same split behavior.

Jump to:

- [1 First Split](#1-first-split)
- [2 Width Geometry](#2-width-geometry)
- [3 Custom DOM](#3-custom-dom)
- [4 Units And Height Flow](#4-units-and-height-flow)
- [5 Buttons](#5-buttons)
- [6 Compact Sliders And Labels](#6-compact-sliders-and-labels)
- [7 Composing Layouts](#7-composing-layouts)
- [Run the Demo](#run-the-demo)

## 1 First Split

![First Split](docs/images/split-first-row.svg)

`split-layout` is structural. Its `children` define slots, not a fixed widget
type. A string child is a semantic leaf slot; a nested object child is another
split node. Once the slots exist, each slot can host a wrapped child pane, a
nested split, or plain DOM.

`wrapPane()` is the standard way to reconnect a child pane to split semantics.
It normalizes the native Tweakpane assumptions that would otherwise add extra
label padding or nested inset inside a split leaf.

<details>
<summary>View code</summary>

```ts
const split = pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: '1fr 1fr',
  gutter: 6,
  children: ['leaf', 'leaf'],
});

const [left, right] = split.getSlots();

const leftPane = new Pane({ container: left });
split.wrapPane(leftPane);
leftPane.registerPlugin(CompactKitBundle);
leftPane.addBlade({
  view: 'sized-button',
  title: 'Button\n3u',
  units: 3,
});

const domHost = document.createElement('div');
domHost.style.height = 'calc(3 * var(--cnt-usz) + 8px)';
right.appendChild(domHost);
```

</details>

## 2 Width Geometry

![Width Geometry](docs/images/split-width-geometry.svg)

Row sizing uses one geometry model. `px` and `%` claim width first, `fr` and
bare numbers divide what remains, and the gutter is applied through the same
rule for every token. That is why equal tracks, ratios, percentages, and fixed
pixels line up naturally instead of forcing the plugin into separate layout
modes.

This also means mixed expressions such as `1fr 3fr 20%` are expected. The row
does not switch strategies when tokens mix. It stays on one virtual horizontal
axis, applies the same gutter rule everywhere, and then exposes the visible
widths that fall out of that single calculation.

<details>
<summary>View code</summary>

```ts
function addRow(sizes: string, labels: string[]) {
  const split = pane.addBlade({
    view: 'split-layout',
    direction: 'row',
    sizes,
    children: labels.map(() => 'leaf'),
  });

  split.getSlots().forEach((slot, index) => {
    const child = new Pane({ container: slot });
    split.wrapPane(child);
    child.registerPlugin(CompactKitBundle);
    child.addBlade({
      view: 'sized-button',
      title: labels[index],
      units: 2,
    });
  });
}

addRow('equal', ['Equal 1', 'Equal 2', 'Equal 3']);
addRow('2fr 1fr', ['2fr', '1fr']);
addRow('20% 80%', ['20%', '80%']);
addRow('1fr 3fr 20%', ['1fr', '3fr', '20%']);
```

</details>

## 3 Custom DOM

![Custom DOM](docs/images/split-custom-dom.svg)

There are two DOM stories in this layout system, and they are not equally
preferred. `Declared Span DOM` is the primary path: if plain DOM already knows
its intended span, publish that span directly on the host. `Measured Fallback
DOM` exists for everything else. The layout only measures when no stronger
contract is available.

This is the current low-level DOM contract: the host reads
`data-split-base-units`, `data-split-live-units`, and
`data-split-unit-behavior`. That is why the demo can make the `Declared Span
DOM` side stay stable while the `Measured Fallback DOM` side grows from its
natural content height, lands a little taller than `4u`, and rounds upward to
avoid clipping.

<details>
<summary>View code</summary>

```ts
const split = pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: '1fr 1fr',
  gutter: 6,
  children: ['declared', 'measured'],
});

const [declaredSlot, measuredSlot] = split.getSlots();

const declared = document.createElement('div');
declared.style.height = 'calc(4 * var(--cnt-usz) + 12px)';
declared.dataset.splitBaseUnits = '4';
declared.dataset.splitLiveUnits = '4';
declared.dataset.splitUnitBehavior = 'fixed';
declaredSlot.appendChild(declared);

const measured = document.createElement('div');
measured.textContent = 'No span is declared here, so split-layout measures this host.';
measured.style.padding = '12px';
measured.style.lineHeight = '1.45';
measuredSlot.appendChild(measured);
```

</details>

## 4 Units And Height Flow

![Units And Height Flow](docs/images/split-units-height-flow.svg)

`units` is the only supported vertical baseline field. Older fields such as
`rowUnits` and `height` are retired. Fixed controls publish their own unit span
directly, adaptive content can grow above its baseline, and shrink-back returns
to the computed baseline for that node rather than some arbitrary measured
height.

In the canonical model, row nodes resolve to the tallest visible child and
column nodes resolve to the sum of visible children. Adaptive content resolves
to `max(baseUnits, liveUnits)`, so a collapsed folder can sit on a small
baseline and still push a row taller when it expands. In the demo, a `Units`
control can republish the declared host span directly, so the right-side DOM
host grows and shrinks by contract rather than by measurement.

<details>
<summary>View code</summary>

```ts
const state = {
  units: 4,
  value: 64,
  thickness: 10,
  rounded: true,
  color: '#22d3ee',
};

const split = pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: '1fr 1fr',
  gutter: 6,
  children: ['controls', 'visual'],
});

const [controlsSlot, visualSlot] = split.getSlots();
const controls = new Pane({ container: controlsSlot });
split.wrapPane(controls);
controls.registerPlugin(CompactKitBundle);
controls.addBinding(state, 'value', { min: 0, max: 100, label: 'Value' });
controls.addBinding(state, 'thickness', { min: 4, max: 20, step: 1, label: 'Thickness' });

const folder = controls.addFolder({ title: 'Details', expanded: false });
folder.addBinding(state, 'rounded', { label: 'Rounded' });
folder.addBinding(state, 'color', { label: '' });
folder.addBinding(state, 'units', { min: 2, max: 6, step: 1, label: 'Units' });

const visual = document.createElement('div');
visual.style.height = 'calc(state.units * var(--cnt-usz) + (state.units - 1) * 4px)';
visual.dataset.splitBaseUnits = String(state.units);
visual.dataset.splitLiveUnits = String(state.units);
visual.dataset.splitUnitBehavior = 'fixed';
visual.appendChild(createDonutGaugeSvg(document, {
  width: Math.max(52, Math.min(96, state.units * 18)),
  height: Math.max(52, Math.min(96, state.units * 18)),
  value: state.value,
  color: state.color,
}));
visualSlot.appendChild(visual);
```

</details>

## 5 Buttons

![Buttons Overview](docs/images/buttons-overview.svg)

![Buttons Boolean On](docs/images/buttons-boolean-on.svg)

Buttons share one content model. The semantic split is still real:
`boolean-button` preserves boolean binding semantics, while `sized-button`
preserves stateless action semantics. Both consume the same `content` shape, so
text-only, icon-only, and mixed icon+text layouts all go through one renderer.

`content` is the normalized long form. `title` and top-level `icon` are
shorthand. `contentOn` only overrides the fields it provides. `iconSize`
belongs to the button itself, so both states share one icon scale. The mixed
icon+text case anchors the icon against the full button box, which keeps the
icon stable while the centered text can change length or wrap across lines.

<details>
<summary>View code</summary>

```ts
const state = { armed: true };

pane.addBinding(state, 'armed', {
  view: 'boolean-button',
  units: 2,
  content: {
    text: 'System\nIdle',
    icon: {
      path: 'M8 2v5M5.2 4.5a4.5 4.5 0 1 0 5.6 0',
      viewBox: '0 0 16 16',
    },
  },
  contentOn: {
    text: 'Signal\nLive',
    icon: {
      path: 'M2.5 11.5 6 8l2.5 2.5 5-6M3 3v10h10',
      viewBox: '0 0 16 16',
    },
  },
});

pane.addBlade({
  view: 'sized-button',
  units: 3,
  iconSize: 22,
  content: {
    text: '3u Multiline\nResizable Icon',
    icon: {
      path: 'M2.5 11.5 6 8l2.5 2.5 5-6M3 3v10h10',
      viewBox: '0 0 16 16',
    },
  },
});
```

</details>

## 6 Compact Sliders And Labels

![Compact Sliders Compare](docs/images/compact-sliders-compare.svg)

![Compact Sliders Split Leaf](docs/images/compact-sliders-split-leaf.svg)

`compactSliders` changes layout treatment only. The native slider logic, value
flow, and binding semantics stay untouched. In the demo, `Native Vs Compact`
keeps a normal slider on the left and isolates the compact treatment on the
right, so the comparison stays literal instead of relying on prose.

`Wrapped Labels` shows the second half of the contract. A wrapped leaf can keep
its visible label when you provide one, or reclaim the full leaf width when you
omit `label`. That is the same inset normalization used by compact sliders, but
demonstrated with an ordinary select control instead of another slider row.

<details>
<summary>View code</summary>

```ts
const compare = pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: '1fr 1fr',
  compactSliders: false,
  children: ['native', 'compact'],
});

const [nativeSlot, compactSlot] = compare.getSlots();

const nativePane = new Pane({ container: nativeSlot });
nativePane.registerPlugin(CompactKitBundle);
nativePane.addBinding({ value: 50 }, 'value', { min: 0, max: 100, label: 'Native' });

const compactHost = new Pane({ container: compactSlot });
compare.wrapPane(compactHost);
compactHost.registerPlugin(CompactKitBundle);

const compactRoot = compactHost.addBlade({
  view: 'split-layout',
  direction: 'row',
  compactSliders: true,
  children: ['leaf'],
});

const [compactLeaf] = compactRoot.getSlots();
const compactPane = new Pane({ container: compactLeaf });
compactRoot.wrapPane(compactPane);
compactPane.registerPlugin(CompactKitBundle);
compactPane.addBinding({ value: 24 }, 'value', { min: 0, max: 100, label: 'Compact' });

const labels = pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  children: ['left', 'right'],
});

const [labeledSlot, unlabeledSlot] = labels.getSlots();
const labeledPane = new Pane({ container: labeledSlot });
labels.wrapPane(labeledPane);
labeledPane.registerPlugin(CompactKitBundle);
labeledPane.addBinding({ mode: 'beta' }, 'mode', {
  label: 'Label',
  options: { Alpha: 'alpha', Beta: 'beta', Gamma: 'gamma' },
});

const unlabeledPane = new Pane({ container: unlabeledSlot });
labels.wrapPane(unlabeledPane);
unlabeledPane.registerPlugin(CompactKitBundle);
unlabeledPane.addBinding({ mode: 'beta' }, 'mode', {
  options: { Alpha: 'alpha', Beta: 'beta', Gamma: 'gamma' },
});
```

</details>

## 7 Composing Layouts

![Composing Layouts](docs/images/composing-layouts.svg)

This is not a separate layout mode. It is the integrated proof that the earlier
rules still hold together when nested rows and columns, wrapped panes,
adaptive folders, multi-unit controls, native bindings, graphs, and button
grids all appear in the same pane.

The important thing to notice is not the individual widgets. It is that the
whole example still follows the same contracts from the earlier chapters: one
horizontal geometry model, one vertical `units` model, the same child-pane
wrapping rules, the same button content contract, and the same slider-layout
inset normalization.

<details>
<summary>View code</summary>

```ts
const root = pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: '1fr 1fr',
  children: [
    {
      view: 'split-layout',
      direction: 'column',
      children: ['action', 'details'],
    },
    'visual',
  ],
});

const actionPane = new Pane({
  container: root.getSlotsByCategory?.('action')?.[0],
});
root.wrapPane(actionPane);
actionPane.registerPlugin(CompactKitBundle);
actionPane.addBlade({
  view: 'sized-button',
  units: 3,
  content: { text: 'Run\nAction' },
});

const detailsPane = new Pane({
  container: root.getSlotsByCategory?.('details')?.[0],
});
root.wrapPane(detailsPane);
detailsPane.registerPlugin(CompactKitBundle);
const folder = detailsPane.addFolder({ title: 'Details', expanded: true });
folder.addBinding({ level: 0.42 }, 'level', { min: 0, max: 1, label: 'Level' });
folder.addBinding({ mode: 'beta' }, 'mode', {
  label: 'Mode',
  options: { Alpha: 'alpha', Beta: 'beta', Gamma: 'gamma' },
});
folder.addButton({ title: 'Apply' });
```

</details>

## Run the Demo

```bash
npm run build
npm run demo
npm run demo:published
```

Open `http://127.0.0.1:5173/` for the guided tour demo.

Open `http://127.0.0.1:5174/` for the consumer-path demo that installs
`tweakpane-compact-kit@latest` from npm and renders the same showcase through
the published package entrypoint.

MIT. Issues and PRs are welcome.
