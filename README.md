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
- [3 Units And Height Flow](#3-units-and-height-flow)
- [4 Control Semantics](#4-control-semantics)
- [5 Composing Layouts](#5-composing-layouts)
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

![Width Geometry](docs/images/split-size-expressions.svg)

Row sizing uses one geometry model. `px` and `%` claim width first, `fr` and
bare numbers divide what remains, and the gutter is applied through the same
rule for every token. That is why equal tracks, ratios, percentages, and fixed
pixels line up naturally instead of forcing the plugin into separate layout
modes.

This also means mixed expressions such as `200px 1fr 30%` are expected. The row
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
addRow('1fr 2fr 2fr', ['1fr', '2fr', '2fr']);
```

</details>

## 3 Units And Height Flow

![Units And Height Flow](docs/images/split-mixed-dom.svg)

`units` is the only supported vertical baseline field. Older fields such as
`rowUnits` and `height` are retired. Fixed controls publish their own unit span
directly, adaptive content can grow above its baseline, and shrink-back returns
to the computed baseline for that node rather than some arbitrary measured
height.

In the canonical model, row nodes resolve to the tallest visible child and
column nodes resolve to the sum of visible children. Known compact-kit controls
publish units directly. Custom DOM that already knows its intended span should
declare that span explicitly. unknown content only falls back to safe measurement
when no stronger contract is available, and that measured fallback rounds upward
so the layout does not clip the control.

<details>
<summary>View code</summary>

```ts
const state = {
  value: 64,
  thickness: 10,
  rounded: true,
  palette: 'cyan' as 'cyan' | 'amber' | 'rose',
  detailLevel: 0.42,
  detailMode: 'beta',
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
folder.addBinding(state, 'palette', {
  label: 'Accent',
  options: { Cyan: 'cyan', Amber: 'amber', Rose: 'rose' },
});
folder.addBinding(state, 'detailLevel', { min: 0, max: 1, label: 'Level' });
folder.addBinding(state, 'detailMode', {
  label: 'Mode',
  options: { Alpha: 'alpha', Beta: 'beta', Gamma: 'gamma' },
});

const gaugeHost = document.createElement('div');
gaugeHost.style.height = 'calc(4 * var(--cnt-usz) + 12px)';
visualSlot.appendChild(gaugeHost);
```

</details>

## 4 Control Semantics

This chapter covers the custom controls without treating them like detached
gadgets. `boolean-button` preserves boolean binding semantics, `sized-button`
preserves action semantics, and `compactSliders` changes layout treatment only.
The public content model stays small: `content` is the normalized long form,
`title` and top-level `icon` are shorthand, and `contentOn` only overrides the
fields it provides.

Icon-only, text-only, and icon-plus-text content are all supported. Mixed
content is rendered through one shared button-content pipeline so both custom
button views behave consistently. Inside split leaves, `wrapPane()` also keeps
native labels and inset assumptions from introducing extra indentation.

### Boolean Buttons

![Boolean Button Off](docs/images/button-boolean-off.svg)

![Boolean Button On](docs/images/button-boolean-on.svg)

Use `boolean-button` when the underlying value is really boolean and should stay
readable through ordinary bindings.

```ts
const state = { enabled: false };

pane.addBinding(state, 'enabled', {
  view: 'boolean-button',
  units: 2,
  content: {
    text: 'System\nStandby',
    icon: {
      path: 'M8 2v5M5.2 4.5a4.5 4.5 0 1 0 5.6 0',
      viewBox: '0 0 16 16',
    },
  },
  contentOn: {
    text: 'System\nArmed',
  },
});
```

### Sized Actions

![Sized Actions](docs/images/button-sized-actions.svg)

Use `sized-button` when the control is a stateless action that should occupy
more than one vertical unit.

```ts
pane.addBlade({
  view: 'sized-button',
  units: 2,
  content: {
    text: 'Run\nAction',
    icon: {
      path: 'M8 2v5M5.2 4.5a4.5 4.5 0 1 0 5.6 0',
      viewBox: '0 0 16 16',
    },
  },
});
```

### Compact Sliders

![Compact Sliders Off](docs/images/compact-sliders-off.svg)

![Compact Sliders On](docs/images/compact-sliders-on.svg)

`compactSliders` changes layout treatment only. The native slider logic, value
flow, and binding semantics stay untouched; the kit only rearranges the label,
groove, and numeric value so dense split rows remain readable.

```ts
const state = { compact: true, leftValue: 50, rightValue: 24 };

pane.addBinding(state, 'compact', {
  view: 'boolean-button',
  units: 2,
  content: {
    text: 'Compact Sliders\nOff',
    icon: { path: 'M3 4h10M2 8h12M5 12h6' },
  },
  contentOn: {
    text: 'Compact Sliders\nOn',
  },
});

const preview = pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: '1fr 1fr',
  compactSliders: state.compact,
  children: ['left', 'right'],
});
```

### Labels Inside Split Leaves

Wrapped child panes normalize the native Tweakpane row chrome that would
otherwise add duplicate label padding or nested inset. That is why the compact
controls in split leaves can line up with row geometry instead of drifting
inward compared with full-width native rows.

## 5 Composing Layouts

![Composing Layouts](docs/images/composing-layouts.svg)

This is not a separate layout mode. It is the integrated proof that the earlier
rules still hold together when semantic slots, nested rows and columns, adaptive
folders, compact sliders, multi-unit controls, and custom DOM all appear in the
same pane.

The important thing to notice is not the individual widgets. It is that the
whole example still follows the same contracts from the earlier chapters: one
horizontal geometry model, one vertical `units` model, the same child-pane
wrapping rules, and the same control semantics.

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
  units: 2,
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
```

Open `http://127.0.0.1:5173/` for the guided tour demo.

Open `http://127.0.0.1:5173/?capture=1` when you want to regenerate the
committed README SVGs from the live page. The demo exposes an `Export README
SVGs` button in capture mode and writes the approved files back into
`docs/images/`.

MIT. Issues and PRs are welcome.
