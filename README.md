# Tweakpane Compact Kit

Compact layout primitives for Tweakpane v4. Ship dense, clean UIs in a ~320px pane without hacks.

- SplitLayout — build rows/columns with gutters, then mount child panes into slots
- SizedButton — multi‑line buttons sized by “units” to align with other blades
- Smart compaction — trims visual gaps; scales slider/value UI so content fits nicely

Works with the official v4 plugin API only. No fallbacks, no logs.

## Install

```bash
npm install tweakpane-compact-kit
```

## Quick Peek

Register the bundle (contains both SplitLayout and SizedButton) and put a multi‑line button next to a plain DOM box.

```ts
import { Pane } from 'tweakpane';
import { CompactKitBundle } from 'tweakpane-compact-kit';

const pane = new Pane();
pane.registerPlugin(CompactKitBundle);

// Row: 1fr | 1fr
const row = pane.addBlade({
  view: 'split-layout', direction: 'row', sizes: '1fr 1fr', children: ['leaf', 'leaf']
});

const [left, right] = row.getSlots();

// Left: 3u multi-line button
const lp = new Pane({ container: left });
lp.registerPlugin(CompactKitBundle);
lp.addBlade({ view: 'sized-button', title: 'Run\nAction', units: 3 });

// Right: 3u plain DOM (not a Tweakpane control)
const box = document.createElement('div');
box.style.height = 'calc(3 * var(--cnt-usz) + 2 * 4px)';
box.style.display = 'grid';
box.style.placeItems = 'center';
box.style.border = '1px dashed #ddd';
box.textContent = '3u DOM';
right.appendChild(box);
```

Note: register the bundle for every Pane you create (plugin pools are per Pane).

## The Demo Layout (Rows)

The demo page is a white background with a compact column (~320px wide). Each row is an independent `split-layout` blade.

1) Row 1 — simplest split: 1fr | 1fr
- Left: 3u multi‑line button “Run↵Action”
- Right: 3u DOM box explaining it’s plain HTML

2) Row 2 — 66 / 34
- Two 2u buttons

3) Row 3 — equal (3 columns)
- Three 2u buttons

4) Row 4 — 1fr 2fr
- Two 2u buttons

5) Row 5 — 40 10 (normalized)
- Two 2u buttons (40:10 → normalized to 80:20)

6) Row 6 — 3u DOM waveform
- A tiny canvas sine wave to show you can place any HTML

The demo source in `test/` builds exactly these rows.

## SplitLayout

Create flexible splits and then mount child panes into slots returned by the API.

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
const pa = new Pane({ container: a }); pa.registerPlugin(CompactKitBundle);
const pb = new Pane({ container: b }); pb.registerPlugin(CompactKitBundle);
```

Size Expressions (pick what reads best for your case):

```ts
// Percent or numeric arrays (auto-normalized)
sizes: [66, 34]
sizes: [40, 10]       // normalized to 80:20

// Equal split
sizes: 'equal'        // any count, from children

// Fractions
sizes: '1fr 2fr'

// Ratios
sizes: { ratio: [1, 2, 1] }

// Auto (N equal parts)
sizes: { auto: 3 }
```

Other options:

```ts
gutter?: number | string // default 6
minSize?: number         // default 20 (min % per panel)
height?: number | string // for column splits
interactive?: boolean    // enable dragging
```

API helpers:

```ts
api.getSlots(): HTMLElement[]
api.getSlotsByCategory(name: string): HTMLElement[]
api.getSlotsByCategoryMap(): Map<string, HTMLElement[]>
api.getCategories(): string[]
```

Each child in `children` can be any string category (e.g. 'leaf', 'audio', 'preview'). Use categories to programmatically fill slots.

## SizedButton

Buttons that span multiple blade rows. The height is computed from Tweakpane’s unit size (`--cnt-usz`) plus gutter compensation so alignment stays tidy.

```ts
pane.addBlade({
  view: 'sized-button',
  title: 'Multi-line\nButton',
  units: 3,
  onClick: () => runAction()
});
```

The button inherits the default Tweakpane theme by using the built-in button classes.

## Usage Notes

- Tweakpane v4 only; bundle `core.major = 2` for compatibility
- Register `CompactKitBundle` for every Pane you create (nested panes too)
- Keep your pane around ~300–340px wide for clean, compact visuals (the demo uses ~320px)

## TypeScript

All public types are exported:

```ts
import type {
  SplitDirection,
  SizeExpression,
  LayoutPreset,
  SizedButtonOptions
} from 'tweakpane-compact-kit';
```

## License

MIT

## Contributing

Issues and PRs are welcome.

