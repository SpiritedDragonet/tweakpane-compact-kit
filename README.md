# Tweakpane Compact Kit

Compact layout primitives for Tweakpane v4. Build dense, clean UIs in ~320px without hacks.

- SplitLayout — build rows/columns with gutters; mount child panes or DOM per slot.
- SizedButton — multi‑line buttons sized by “units” aligned with Tweakpane blade grid.
- Smart compaction — trims visual gaps; optionally compacts slider/value UI.

Works with the official v4 plugin API only.

## Install

```bash
npm install tweakpane-compact-kit
```

## Getting Started

Register the bundle (includes both SplitLayout and SizedButton) for every Pane you create.

```ts
import { Pane } from 'tweakpane';
import { CompactKitBundle } from 'tweakpane-compact-kit';

const pane = new Pane();
pane.registerPlugin(CompactKitBundle); // register per Pane

// 1) A simple row: 1fr | 1fr
const row = pane.addBlade({
  view: 'split-layout', direction: 'row', sizes: '1fr 1fr', children: ['leaf', 'leaf']
});

const [L, R] = row.getSlots();

// Left: 3-unit button
const pL = new Pane({ container: L }); pL.registerPlugin(CompactKitBundle);
pL.addBlade({ view: 'sized-button', title: 'Run\nAction', units: 3 });

// Right: 3-unit DOM box (plain HTML)
const box = document.createElement('div');
box.style.height = 'calc(3 * var(--cnt-usz) + 2 * 4px)';
box.style.display = 'grid';
box.style.placeItems = 'center';
box.textContent = '3u DOM';
R.appendChild(box);
```

Tip: use `CompactKitBundle` on nested panes too.

## Demo Overview

The demo page shows a compact column (~320px). Each row is its own `split-layout` blade.

1) Row 1 — simplest split: 1fr | 1fr
- Left: 3u `sized-button` “Run↵Action”
- Right: 3u DOM text

2) Row 2 — 66 / 34
- Two 2u buttons

3) Row 3 — equal (3 columns)
- Three 2u buttons

4) Row 4 — 1fr 2fr
- Left button title: `1fr`; Right button title: `2fr`

5) Row 5 — 40 10 (normalized)
- Two 2u buttons (40:10 → normalized to 80:20)

7) Row 7 — Donut Gauge + Controls
- Left: four controls (Value, Thickness, Rounded, Color)
- Right: 4u donut gauge (pure DOM canvas)
- Hint: the Color control intentionally hides its label by passing `label: ''` so the label view is removed for that binding only.

The demo source in `demo/` builds these rows plus extra sections below.

### Compact Sliders Toggle
- Compare compact vs. original slider layout side by side.
- Toggle `compactSliders` to scale slider surface and reposition numeric inputs without breaking value editing.

### Custom Categories (Semantic Leaves)
- Use your own strings instead of `'leaf'` in `children` (e.g., `'alpha'`, `'beta'`).
- Fill slots by category using the API (`getSlotsByCategory`, `getSlotsByCategoryMap`).

## SplitLayout

Create flexible splits and mount child panes into returned slots.

```ts
const api = pane.addBlade({
  view: 'split-layout',
  direction: 'row',          // 'row' | 'column'
  sizes: '1fr 2fr',          // see “Size Expressions” below
  gutter: 6,                 // px
  interactive: false,        // static by default
  children: ['leaf', 'leaf'] // one slot per child
});

const [a, b] = api.getSlots();
```

Size Expressions (pick what reads best for your case):

```ts
// Numeric arrays (auto-normalized ratios)
sizes: [66, 34]       // 66:34 ratio
sizes: [1, 2, 1]      // 1:2:1 ratio

// Fractions (CSS Grid-like, recommended)
sizes: '1fr 2fr'      // 1:2 ratio
sizes: '1fr 1fr 1fr'  // 1:1:1 ratio

// Equal split
sizes: 'equal'        // auto-equal from children count
```

Other options:

```ts
gutter?: number | string // default 6
minSize?: number         // default 20 (min % per panel)
height?: number | string // for column splits
interactive?: boolean    // enable dragging
compactSliders?: boolean // compact slider/value layout (default true)
```

Imperative API:

```ts
api.getSlots(): HTMLElement[]
api.getSlotsByCategory(name: string): HTMLElement[]
api.getSlotsByCategoryMap(): Map<string, HTMLElement[]>
api.getCategories(): string[]
```

Children can be strings (categories) or nested split nodes. Strings are user-defined categories (e.g. `'leaf'`, `'alpha'`, `'preview'`).

### Column Splits with Row Units

For vertical layouts, you can allocate per-row “units” aligned to Tweakpane’s blade unit size. The container height is computed automatically.

```ts
pane.addBlade({
  view: 'split-layout',
  direction: 'column',
  rowUnits: '1 1 2',   // top=1u, mid=1u, bottom=2u
  gutter: 6,
  children: ['leaf', 'leaf', 'leaf']
});
```

### Label Policy for Compact UIs

When using `SplitLayout`, you can wrap a Pane instance so `addBinding()` hides the label when a label is not provided or is an empty string:

```ts
const api = pane.addBlade({ view: 'split-layout', direction: 'row', sizes: '1fr', children: ['leaf'] }) as any;
const [slot] = api.getSlots();
const p = new Pane({ container: slot });
(api as any).wrapPane?.(p);
// This binding will hide the label because label is empty:
p.addBinding({ color: '#22d3ee' }, 'color', { label: '' });
```

## SizedButton

Buttons that span multiple blade rows. Height is computed from Tweakpane’s unit size (`--cnt-usz`) with gutter compensation so alignment stays tidy.

```ts
pane.addBlade({
  view: 'sized-button',
  title: 'Multi-line\nButton',
  units: 3,
  onClick: () => runAction()
});
```

## Run the Demo

```bash
# build the library first
npm run build

# start the demo dev server (aliases src to local source)
npm run demo
```

Open the shown URL. Try the “Compact vs Original” section, drag gutters, and adjust the Donut Gauge.

## TypeScript

Public types are exported:

```ts
import type {
  SplitDirection,
  SizeExpression,
  SizedButtonOptions
} from 'tweakpane-compact-kit';
```

## Notes

- Tweakpane v4 only; bundle `core.major = 2` for compatibility.
- Register `CompactKitBundle` for every Pane you create (nested panes too).
- Keep your Pane around ~300–340px wide for compact visuals (the demo uses ~320px).

## License

MIT

## Contributing

Issues and PRs are welcome.
