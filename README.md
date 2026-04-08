# Tweakpane Compact Kit

## Overview

A small add-on kit for Tweakpane v4. It adds split layouts, multi-unit buttons,
and a compact slider layout while still lining up with the native UI.

The easiest way to learn it is to read this README in the same order as the
demo page. The chapter numbers match.

## Install

```bash
npm install tweakpane tweakpane-compact-kit
```

Peer dependency: `tweakpane` v4.

## Quick Start

```ts
import { Pane } from 'tweakpane';
import { CompactKitBundle } from 'tweakpane-compact-kit';

// Register once on the pane that will host the custom blades.
const pane = new Pane();
pane.registerPlugin(CompactKitBundle);

// split-layout creates a row or column of cells.
// Each string in `children` creates one leaf cell in order.
const split = pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: '1fr 1fr',
  children: ['left', 'right'],
});

// getSlots() returns the DOM hosts for those cells in the same order.
const [left, right] = split.getSlots();

// Mount a child pane into the left cell.
const leftPane = new Pane({ container: left });
leftPane.registerPlugin(CompactKitBundle);

// wrapPane() keeps the child pane flush with the split cell.
split.wrapPane(leftPane);

leftPane.addBlade({
  view: 'sized-button',
  title: 'Launch',
  units: 2,
});

// Plain DOM can live in a split cell too.
const rightHost = document.createElement('div');
right.appendChild(rightHost);
```

Each string in `children` creates one leaf cell and also gives that cell a
category name. A child `Pane`, another split, or plain DOM can all live inside
that cell. When the cell hosts a child `Pane`, register `CompactKitBundle` on
that child too and call `split.wrapPane(childPane)` so the nested pane sits
flush with the cell. Later examples show object entries in `children`, which
create nested split nodes.

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

Picture `split-layout` as a layout frame that hands you cells. A string child
creates one leaf cell. Once you have that cell, you can mount another pane,
another split, or plain DOM into it.

`wrapPane()` is the step that makes a child pane read like content of the cell.
Without it, the child pane keeps Tweakpane's usual nested inset, and wrapped
full-width cleanup such as hidden-label rows will not kick in.

<details>
<summary>View code</summary>

```ts
// Create one horizontal split with two leaf cells.
// `children` defines the cell count and order.
const split = pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: '1fr 1fr',
  gutter: 6,
  children: ['leaf', 'leaf'],
});

const [left, right] = split.getSlots();

// Anything mounted into a split cell can be another Pane.
const leftPane = new Pane({ container: left });

// wrapPane() removes the native nested inset so the child pane lines up with
// the split cell and reads like content of that cell.
split.wrapPane(leftPane);
leftPane.registerPlugin(CompactKitBundle);

// sized-button is a fixed-height action button.
// `units: 3` means the button occupies 3 vertical grid units.
leftPane.addBlade({
  view: 'sized-button',
  title: 'Button\n3u',
  units: 3,
});

// A split cell can also host plain DOM directly.
const domHost = document.createElement('div');

// This DOM block is given the same visual height as a 3u control.
domHost.style.height = 'calc(3 * var(--cnt-usz) + 8px)';
right.appendChild(domHost);
```

</details>

## 2 Width Geometry

![Width Geometry](docs/images/split-width-geometry.svg)

Rows follow one width rule. `px` and `%` take their space first, then `fr`
shares what is left. That keeps equal splits, ratios, fixed widths, and mixed
rows lined up.

So a row like `1fr 3fr 20%` just works.

<details>
<summary>View code</summary>

```ts
// Small helper: create one row and fill it with 2u buttons so the width math
// is easy to compare.
function addRow(sizes: string, labels: string[]) {
  const split = pane.addBlade({
    view: 'split-layout',
    direction: 'row',

    // `sizes` accepts equal, fr, %, px, or mixed expressions.
    sizes,
    children: labels.map(() => 'leaf'),
  });

  split.getSlots().forEach((slot, index) => {
    const child = new Pane({ container: slot });

    // Wrap every nested pane that lives inside a split cell.
    split.wrapPane(child);
    child.registerPlugin(CompactKitBundle);

    // Keep height fixed at 2u so only width changes between examples.
    child.addBlade({
      view: 'sized-button',
      title: labels[index],
      units: 2,
    });
  });
}

// Equal tracks.
addRow('equal', ['Equal 1', 'Equal 2', 'Equal 3']);

// Fractional tracks share the remaining width.
addRow('2fr 1fr', ['2fr', '1fr']);

// Percentages claim width directly.
addRow('20% 80%', ['20%', '80%']);

// Mixed expressions still use the same row layout rule.
addRow('1fr 3fr 20%', ['1fr', '3fr', '20%']);
```

</details>

## 3 Custom DOM

![Custom DOM](docs/images/split-custom-dom.svg)

Plain DOM has two paths in a split. If you already know the span, publish that
span and give the host a matching CSS height. If the height should come from
content, append plain DOM and let the layout measure it.

In the demo, the left block says "I am 4u tall" and stays there. The right
block is plain content with no split metadata, so its height comes from the
content box.

<details>
<summary>View code</summary>

```ts
// One row with two slots: one will declare its span, the other will rely on
// measurement.
const split = pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: '1fr 1fr',
  gutter: 6,
  children: ['declared', 'measured'],
});

const [declaredSlot, measuredSlot] = split.getSlots();

// Declared DOM: you already know that this block should behave like a 4u item.
const declared = document.createElement('div');

// The CSS height and the published split units should describe the same span.
declared.style.height = 'calc(4 * var(--cnt-usz) + 12px)';

// baseUnits = baseline height
// liveUnits = current visible height
// fixed      = do not auto-grow beyond the declared span
declared.dataset.splitBaseUnits = '4';
declared.dataset.splitLiveUnits = '4';
declared.dataset.splitUnitBehavior = 'fixed';
declaredSlot.appendChild(declared);

// Measured DOM: no split metadata is needed here.
// split-layout measures the content box and rounds up to a whole unit count.
const measured = document.createElement('div');
measured.textContent = 'No span is declared here, so split-layout measures this host.';
measured.style.padding = '12px';
measured.style.lineHeight = '1.45';
measuredSlot.appendChild(measured);
```

</details>

## 4 Units And Height Flow

![Units And Height Flow](docs/images/split-units-height-flow.svg)

Use `units` when a blade has a known fixed span, such as a sized button. Native
controls already report their own height. Rows follow the tallest visible
child. Columns stack the heights of their visible children.

Folders and other expanding controls can grow when opened and settle back when
closed. In the demo, the `Units` control changes the right-side DOM block
directly, so that block grows and shrinks through its declared span.

<details>
<summary>View code</summary>

```ts
// Keep the demo state in one object so bindings and the visual preview stay in
// sync.
const state = {
  units: 4,
  value: 64,
  thickness: 10,
  rounded: true,
  color: '#22d3ee',
};

// Left slot = regular Tweakpane controls.
// Right slot = plain DOM that publishes its current span.
const split = pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: '1fr 1fr',
  gutter: 6,
  children: ['controls', 'visual'],
});

const [controlsSlot, visualSlot] = split.getSlots();

// Mount the control pane into the left split cell.
const controls = new Pane({ container: controlsSlot });
split.wrapPane(controls);
controls.registerPlugin(CompactKitBundle);

// These are ordinary Tweakpane bindings.
// Sliders and inputs already know their own height, so no manual `units` field
// is needed here.
controls.addBinding(state, 'value', { min: 0, max: 100, label: 'Value' });
controls.addBinding(state, 'thickness', { min: 4, max: 20, step: 1, label: 'Thickness' });

// Folders are adaptive: collapsed height is small, expanded height can grow.
const folder = controls.addFolder({ title: 'Details', expanded: false });
folder.addBinding(state, 'rounded', { label: 'Rounded' });
folder.addBinding(state, 'color', { label: '' });

// This binding updates the declared span for the DOM preview on the right.
folder.addBinding(state, 'units', { min: 2, max: 6, step: 1, label: 'Units' });

// The visual preview is plain DOM. Here it follows declared units.
const visual = document.createElement('div');
visual.style.height = 'calc(state.units * var(--cnt-usz) + (state.units - 1) * 4px)';
visual.dataset.splitBaseUnits = String(state.units);
visual.dataset.splitLiveUnits = String(state.units);
visual.dataset.splitUnitBehavior = 'fixed';

// The donut graphic itself is just regular SVG inserted into that DOM host.
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

Buttons use one content format. Use `boolean-button` for a true/false value.
Use `sized-button` for a plain action button. Both support text only, icon
only, or icon + text.

Use the full `content` object when you want more control, or the shorter
`title` and `icon` fields for quick cases. `contentOn` only needs the parts
that change in the pressed state. Think of `content` as the face drawn on the
button. `iconSize` applies to the whole button, so both states stay aligned.

<details>
<summary>View code</summary>

```ts
const state = { armed: true };

// boolean-button is a real binding, so use addBinding().
// The blade reads and writes `state.armed`.
pane.addBinding(state, 'armed', {
  view: 'boolean-button',

  // Like other fixed-height controls, buttons use `units` for vertical span.
  units: 2,

  // `content` is the default visual state.
  content: {
    text: 'System\nIdle',
    icon: {
      path: 'M8 2v5M5.2 4.5a4.5 4.5 0 1 0 5.6 0',
      viewBox: '0 0 16 16',
    },
  },

  // `contentOn` only needs to provide the pieces that change when the boolean
  // becomes true.
  contentOn: {
    text: 'Signal\nLive',
    icon: {
      path: 'M2.5 11.5 6 8l2.5 2.5 5-6M3 3v10h10',
      viewBox: '0 0 16 16',
    },
  },
});

// sized-button is stateless, so use addBlade().
pane.addBlade({
  view: 'sized-button',
  units: 3,

  // One iconSize value covers the whole button.
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

`compactSliders` changes the slider layout for the split subtree that owns the
leaf. The binding and slider logic stay the same. In the demo, the left side
keeps the native layout and the right side turns on the compact layout.

`Wrapped Labels` shows the other half of the same idea. Start by mounting the
child pane into the split leaf and calling `wrapPane()` on that child pane. Then
controls with a real `label` keep their inline title area, while controls with
`label: ''` or no `label` use the full width of the split leaf.

<details>
<summary>View code</summary>

```ts
// First row: compare a native slider against the compact slider treatment.
const compare = pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: '1fr 1fr',

  // The outer comparison row keeps native slider layout.
  compactSliders: false,
  children: ['native', 'compact'],
});

const [nativeSlot, compactSlot] = compare.getSlots();

// Left side: untouched native Tweakpane slider.
const nativePane = new Pane({ container: nativeSlot });
nativePane.registerPlugin(CompactKitBundle);
nativePane.addBinding({ value: 50 }, 'value', { min: 0, max: 100, label: 'Native' });

// Right side: a wrapped child pane inside the split cell.
const compactHost = new Pane({ container: compactSlot });
compare.wrapPane(compactHost);
compactHost.registerPlugin(CompactKitBundle);

// Inside that wrapped pane, create a second split root that turns on compact
// slider layout for the controls mounted under that root.
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

// Second row: wrapped controls with and without a visible label.
const labels = pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  children: ['left', 'right'],
});

const [labeledSlot, unlabeledSlot] = labels.getSlots();
const labeledPane = new Pane({ container: labeledSlot });
labels.wrapPane(labeledPane);
labeledPane.registerPlugin(CompactKitBundle);

// When `label` is present, the wrapped control keeps its inline title area.
labeledPane.addBinding({ mode: 'beta' }, 'mode', {
  label: 'Label',
  options: { Alpha: 'alpha', Beta: 'beta', Gamma: 'gamma' },
});

const unlabeledPane = new Pane({ container: unlabeledSlot });
labels.wrapPane(unlabeledPane);
unlabeledPane.registerPlugin(CompactKitBundle);

// Hidden-label layout is only applied after wrapPane().
// Use `label: ''` or omit `label` when the control should fill the whole leaf.
unlabeledPane.addBinding({ mode: 'beta' }, 'mode', {
  label: '',
  options: { Alpha: 'alpha', Beta: 'beta', Gamma: 'gamma' },
});
```

</details>

## 7 Composing Layouts

![Composing Layouts](docs/images/composing-layouts.svg)

This is the full example that mixes the earlier pieces together: nested rows
and columns, wrapped panes, folders, buttons, native controls, graphs, and
custom layout blocks.

It is here to show that the same rules still hold when you combine everything
in one denser pane.

Read `children` here as a layout tree. A string entry creates a leaf cell. An
object entry creates another split-layout node. The top level in this example
is one row: a nested column on the left and one leaf cell on the right. When a
leaf name matters, you can retrieve that cell with `getSlotsByCategory()`.

<details>
<summary>View code</summary>

```ts
// A larger composition can mix row and column nodes in one tree.
const root = pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: '1fr 1fr',
  children: [
    {
      view: 'split-layout',

      // This object entry creates another split node.
      // Its children stack vertically because the direction is `column`.
      direction: 'column',
      children: ['action', 'details'],
    },

    // A string entry creates a leaf cell.
    'visual',
  ],
});

// String names also work as category names.
// getSlotsByCategory() is handy when a larger tree is easier to read by name.
const actionPane = new Pane({
  container: root.getSlotsByCategory?.('action')?.[0],
});
root.wrapPane(actionPane);
actionPane.registerPlugin(CompactKitBundle);

// A 3u action button in the upper-left cell.
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

// This nested folder shows that ordinary Tweakpane controls and adaptive
// controls can live inside a composed split layout too.
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
# Build the distributable library files.
npm run build

# Start the source-linked local demo on http://127.0.0.1:5173/.
npm run demo

# Start the npm-installed demo on http://127.0.0.1:5174/.
npm run demo:published
```

Open `http://127.0.0.1:5173/` for the guided tour demo.

Open `http://127.0.0.1:5174/` to check the published package through the npm
install path a user would take.

MIT. Issues and PRs are welcome.
