# Boolean Button and Single Geometry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first-class `boolean-button` binding view, refactor button rendering into a shared shell/content stack, and switch split-layout to the approved single-geometry gutter formula without regressing the current demo or documented API.

**Architecture:** Create shared `buttonContent` and `buttonShell` modules, migrate `sized-button` onto them, and then add `boolean-button` as a Tweakpane `input` plugin that maps boolean state onto the shared button presentation. Replace the current split-layout width interpretation with a geometry helper based on virtual span `T + g`, update row layout and interactive gutter dragging to use explicit visible-width math, and finish with README + demo updates that document and showcase the new semantics.

**Tech Stack:** TypeScript, Tweakpane v4, Vite, Vitest, JSDOM

---

## Preflight Notes

- Execute this plan in a dedicated worktree before Task 1. The current checkout is `main` with the approved spec already committed on top of `origin/main`.
- Keep the current public `sized-button` shorthand (`title`, `units`, `onClick`) working while introducing the shared content model.
- Keep `Compact Sliders Toggle`; add the new boolean-button demo beside it instead of replacing it.
- Do not reintroduce any second split interpretation such as "track mode" or "free mode".
- Keep edits ASCII-only unless a file already requires otherwise.
- For the new binding-view plugin shape, use the built-in `BooleanInputPlugin` in `node_modules/tweakpane/dist/tweakpane.js` around lines `3839-3888` as the implementation reference.

## File Map

**Create**

- `src/core/button/buttonContent.ts`
  - Shared `ButtonIcon` / `ButtonContent` types, shorthand normalization, off/on merge rules, and icon/text DOM rendering.
- `src/core/button/buttonContent.test.ts`
  - Unit tests for text-only, icon-only, icon + text, and inheritance/merge behavior.
- `src/core/button/buttonShell.ts`
  - Shared button shell using `.tp-btnv` / `.tp-btnv_b`, `units` height calculation, pressed-state styling hooks, and content mount ownership.
- `src/core/SizedButtonPlugin.test.ts`
  - Integration coverage for the migrated `sized-button` shorthand and shared shell behavior.
- `src/core/BooleanButtonPlugin.ts`
  - New boolean binding view plugin using the shared button shell/content stack.
- `src/core/BooleanButtonPlugin.test.ts`
  - Integration coverage for toggle behavior, off/on content inheritance, and multi-unit rendering.
- `src/core/split/singleGeometry.ts`
  - Numeric and CSS-expression helpers for the approved virtual-span split geometry.
- `src/core/split/singleGeometry.test.ts`
  - Geometry tests for visible widths, divider positions, and natural alignment cases.
- `src/core/split/interactiveGutters.test.ts`
  - Tests for drag math that preserves gutter width under the new row geometry.

**Modify**

- `src/core/SizedButtonPlugin.ts`
  - Replace ad hoc rendering with the shared shell/content modules while preserving the public blade API.
- `src/core/split/sizeExpressions.ts`
  - Keep token parsing, but make the resolver return pre-cut spans instead of the old visible-width interpretation.
- `src/core/split/sizeExpressions.test.ts`
  - Update expectations so `px` / `%` semantics match the new pre-cut model.
- `src/core/split/layoutBuilder.ts`
  - Use single-geometry basis expressions for row splits instead of the old flex-grow/gap interpretation.
- `src/core/split/interactiveGutters.ts`
  - Convert row dragging to explicit visible-width updates so dragging still works under the new formula.
- `src/core/SplitLayoutPlugin.test.ts`
  - Keep slot/disposal tests passing and add any needed integration coverage for the new row geometry wiring.
- `src/index.ts`
  - Export `BooleanButtonPlugin`, bundle it, and merge its CSS into `CompactKitBundle`.
- `README.md`
  - Document `boolean-button`, the shared content model, the `Button Extensions` demo area, and the pre-cut meaning of `px` / `%`.
- `demo/main.ts`
  - Add the `Button Extensions` section, keep `Compact Sliders Toggle`, add boolean-button examples, and update the size demo rows to show alignment cases.

### Task 1: Create the shared button content model

**Files:**

- Create: `src/core/button/buttonContent.ts`
- Create: `src/core/button/buttonContent.test.ts`

- [ ] **Step 1: Write the failing button content tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  mergeButtonContent,
  normalizeButtonContent,
  renderButtonContent,
} from './buttonContent';

describe('normalizeButtonContent', () => {
  it('maps title and top-level icon into shared content', () => {
    expect(
      normalizeButtonContent({
        title: 'Monitor\nGraph',
        icon: {path: 'M1 1L15 15'},
      }),
    ).toEqual({
      text: 'Monitor\nGraph',
      icon: {path: 'M1 1L15 15'},
    });
  });
});

describe('mergeButtonContent', () => {
  it('lets on-state content inherit missing fields from the base state', () => {
    expect(
      mergeButtonContent(
        {text: 'Compact', icon: {path: 'M3 8h10'}},
        {text: 'Compact On'},
      ),
    ).toEqual({
      text: 'Compact On',
      icon: {path: 'M3 8h10'},
    });
  });
});

describe('renderButtonContent', () => {
  it('renders icon + text without custom user DOM', () => {
    const el = renderButtonContent(document, {
      text: 'Compact Sliders',
      icon: {path: 'M3 8h10', viewBox: '0 0 16 16'},
    });

    expect(el.querySelector('svg')).not.toBeNull();
    expect(el.textContent).toContain('Compact Sliders');
  });
});
```

- [ ] **Step 2: Run the content test to verify it fails**

Run: `npm.cmd exec vitest run src/core/button/buttonContent.test.ts`

Expected: FAIL with `Cannot find module './buttonContent'`

- [ ] **Step 3: Implement `src/core/button/buttonContent.ts`**

```ts
export type ButtonIcon =
  | string
  | {path: string; viewBox?: string};

export type ButtonContent = {
  text?: string;
  icon?: ButtonIcon;
};

export function normalizeButtonContent(input: {
  title?: string;
  icon?: ButtonIcon;
  content?: ButtonContent;
}): ButtonContent {
  return {
    text: input.content?.text ?? input.title ?? '',
    icon: input.content?.icon ?? input.icon,
  };
}

export function mergeButtonContent(
  base: ButtonContent,
  override?: ButtonContent,
): ButtonContent {
  return {
    text: override?.text ?? base.text,
    icon: override?.icon ?? base.icon,
  };
}

export function renderButtonContent(
  doc: Document,
  content: ButtonContent,
): HTMLElement {
  const root = doc.createElement('span');
  root.className = 'tp-btnc';
  // append controlled icon/text nodes only
  return root;
}
```

- [ ] **Step 4: Re-run the content test**

Run: `npm.cmd exec vitest run src/core/button/buttonContent.test.ts`

Expected: PASS

- [ ] **Step 5: Commit the shared content model**

```bash
git add src/core/button/buttonContent.ts src/core/button/buttonContent.test.ts
git commit -m "refactor: add shared button content model"
```

### Task 2: Create the shared button shell and migrate `sized-button`

**Files:**

- Create: `src/core/button/buttonShell.ts`
- Create: `src/core/SizedButtonPlugin.test.ts`
- Modify: `src/core/SizedButtonPlugin.ts`

- [ ] **Step 1: Write the failing `sized-button` integration tests**

```ts
import { describe, expect, it } from 'vitest';
import { Pane } from 'tweakpane';
import { CompactKitBundle } from '../index';

describe('SizedButtonPlugin', () => {
  it('keeps title shorthand working after the shell refactor', () => {
    const pane = new Pane({container: document.body});
    pane.registerPlugin(CompactKitBundle);
    const api = pane.addBlade({
      view: 'sized-button',
      title: 'Monitor\nGraph',
      units: 2,
    }) as any;

    const button = api.controller.buttonEl as HTMLButtonElement;
    expect(button.textContent).toContain('Monitor');
    expect(button.style.height).toBe('40px');
  });

  it('renders icon + text content through the shared shell', () => {
    const pane = new Pane({container: document.body});
    pane.registerPlugin(CompactKitBundle);
    const api = pane.addBlade({
      view: 'sized-button',
      units: 2,
      content: {
        text: 'Compact Sliders',
        icon: {path: 'M3 8h10', viewBox: '0 0 16 16'},
      },
    }) as any;

    const root = api.controller.view.element as HTMLElement;
    expect(root.querySelector('svg')).not.toBeNull();
    expect(root.textContent).toContain('Compact Sliders');
  });
});
```

- [ ] **Step 2: Run the `sized-button` test to verify it fails**

Run: `npm.cmd exec vitest run src/core/SizedButtonPlugin.test.ts`

Expected: FAIL because `content` is not accepted yet and no shared shell exists

- [ ] **Step 3: Create `src/core/button/buttonShell.ts` and refactor `SizedButtonPlugin.ts` to use it**

```ts
export type ButtonShellState = {
  pressed?: boolean;
  accentColor?: string;
};

export function createButtonShell(doc: Document, options: {
  units: number;
  state?: ButtonShellState;
}): {
  root: HTMLElement;
  button: HTMLButtonElement;
  contentHost: HTMLElement;
  setUnits: (units: number) => void;
  setState: (state: ButtonShellState) => void;
} {
  const root = doc.createElement('div');
  const wrapper = doc.createElement('div');
  const button = doc.createElement('button');
  const contentHost = doc.createElement('span');
  // build `.tp-btnv > .tp-btnv_b`, mount contentHost, apply unit sizing
  return {root, button, contentHost, setUnits, setState};
}
```

```ts
// src/core/SizedButtonPlugin.ts
const shell = createButtonShell(document, {units});
shell.contentHost.appendChild(renderButtonContent(document, normalizedContent));
this.buttonEl = shell.button;
this.view = {element: shell.root};
```

- [ ] **Step 4: Re-run the `sized-button` test**

Run: `npm.cmd exec vitest run src/core/SizedButtonPlugin.test.ts`

Expected: PASS

- [ ] **Step 5: Run the build to verify the migrated plugin still bundles**

Run: `npm.cmd run build`

Expected: PASS

- [ ] **Step 6: Commit the shared shell migration**

```bash
git add src/core/button/buttonShell.ts src/core/SizedButtonPlugin.ts src/core/SizedButtonPlugin.test.ts
git commit -m "refactor: migrate sized button to shared shell"
```

### Task 3: Add the `boolean-button` binding view

**Files:**

- Create: `src/core/BooleanButtonPlugin.ts`
- Create: `src/core/BooleanButtonPlugin.test.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Write the failing `boolean-button` integration tests**

```ts
import { describe, expect, it } from 'vitest';
import { Pane } from 'tweakpane';
import { CompactKitBundle } from '../index';

describe('BooleanButtonPlugin', () => {
  it('toggles a boolean binding when clicked', () => {
    const state = {compact: false};
    const pane = new Pane({container: document.body});
    pane.registerPlugin(CompactKitBundle);
    const api = pane.addBinding(state, 'compact', {
      view: 'boolean-button',
      title: 'Compact Sliders',
      units: 2,
    }) as any;

    (api.controller.buttonEl as HTMLButtonElement).click();
    expect(state.compact).toBe(true);
  });

  it('inherits missing on-state fields from base content', () => {
    const state = {enabled: true};
    const pane = new Pane({container: document.body});
    pane.registerPlugin(CompactKitBundle);
    const api = pane.addBinding(state, 'enabled', {
      view: 'boolean-button',
      content: {
        text: 'Enabled',
        icon: {path: 'M3 8h10', viewBox: '0 0 16 16'},
      },
      contentOn: {
        text: 'Enabled On',
      },
      units: 2,
    }) as any;

    const root = api.controller.view.element as HTMLElement;
    expect(root.textContent).toContain('Enabled On');
    expect(root.querySelector('svg')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run the `boolean-button` test to verify it fails**

Run: `npm.cmd exec vitest run src/core/BooleanButtonPlugin.test.ts`

Expected: FAIL because the plugin is not registered yet

- [ ] **Step 3: Implement `src/core/BooleanButtonPlugin.ts` as a Tweakpane input plugin**

```ts
export const BooleanButtonPlugin: any = {
  id: 'boolean-button',
  type: 'input',
  core: {major: 2, minor: 0, patch: 0},
  accept(value: unknown, params: any) {
    if (params?.view !== 'boolean-button') return null;
    if (typeof value !== 'boolean') return null;
    return {
      initialValue: value,
      params: {
        units: Math.max(1, Math.floor(params.units ?? 1)),
        offColor: params.offColor,
        onColor: params.onColor,
        content: normalizeButtonContent(params),
        contentOn: params.contentOn,
      },
    };
  },
  binding: {
    reader: () => boolFromUnknown,
    writer: () => writePrimitive,
  },
  controller(args: any) {
    return new BooleanButtonController(args);
  },
};
```

- [ ] **Step 4: Export the plugin and add it to `CompactKitBundle`**

```ts
export {
  BooleanButtonPlugin,
  type BooleanButtonOptions,
} from './core/BooleanButtonPlugin';

const _css = `${_Split.css ?? ''}\n${_Sized.css ?? ''}\n${_Bool.css ?? ''}`;
export const CompactKitBundle = {
  id: 'tweakpane-compact-kit',
  css: _css,
  plugins: [_Split, _Sized, _Bool],
};
```

- [ ] **Step 5: Re-run the boolean-button test and the button-focused suite**

Run: `npm.cmd exec vitest run src/core/button/buttonContent.test.ts src/core/SizedButtonPlugin.test.ts src/core/BooleanButtonPlugin.test.ts`

Expected: PASS

- [ ] **Step 6: Run the build**

Run: `npm.cmd run build`

Expected: PASS

- [ ] **Step 7: Commit the new binding view**

```bash
git add src/core/BooleanButtonPlugin.ts src/core/BooleanButtonPlugin.test.ts src/index.ts
git commit -m "feat: add boolean button binding view"
```

### Task 4: Implement the approved single split geometry

**Files:**

- Create: `src/core/split/singleGeometry.ts`
- Create: `src/core/split/singleGeometry.test.ts`
- Modify: `src/core/split/sizeExpressions.ts`
- Modify: `src/core/split/sizeExpressions.test.ts`
- Modify: `src/core/split/layoutBuilder.ts`

- [ ] **Step 1: Write the failing geometry tests**

```ts
import { describe, expect, it } from 'vitest';
import { parseSizeExpression } from './sizeExpressions';
import { computeSplitGeometry } from './singleGeometry';

describe('computeSplitGeometry', () => {
  it('aligns 20/80 with 1fr 2fr 2fr at the first divider', () => {
    const a = computeSplitGeometry(parseSizeExpression([20, 80], 2), 1000, 6);
    const b = computeSplitGeometry(parseSizeExpression('1fr 2fr 2fr', 3), 1000, 6);
    expect(a.dividerStartsPx[0]).toBeCloseTo(b.dividerStartsPx[0], 6);
  });

  it('uses pre-cut px and percent spans for mixed syntax', () => {
    const g = computeSplitGeometry(parseSizeExpression('200px 1fr 30%', 3), 1000, 6);
    expect(g.preCutPx).toEqual([200, 506, 300]);
    expect(g.visiblePx).toEqual([194, 500, 294]);
  });
});
```

- [ ] **Step 2: Run the geometry test to verify it fails**

Run: `npm.cmd exec vitest run src/core/split/singleGeometry.test.ts`

Expected: FAIL with `Cannot find module './singleGeometry'`

- [ ] **Step 3: Implement `src/core/split/singleGeometry.ts`**

```ts
import type { SizeToken } from './sizeExpressions';

export function computeSplitGeometry(
  tokens: SizeToken[],
  containerPx: number,
  gutterPx: number,
) {
  const virtualPx = containerPx + gutterPx;
  const preCutPx = resolvePreCutSpans(tokens, containerPx, virtualPx);
  const visiblePx = preCutPx.map((span) => Math.max(0, span - gutterPx));
  const dividerStartsPx = [];
  let cursor = 0;
  for (let i = 0; i < visiblePx.length - 1; i += 1) {
    cursor += visiblePx[i];
    dividerStartsPx.push(cursor);
    cursor += gutterPx;
  }
  return {virtualPx, preCutPx, visiblePx, dividerStartsPx};
}

export function buildVisibleBasisCss(tokens: SizeToken[], gutterPx: number): string[] {
  // return CSS calc() expressions such as:
  // calc(((100% + 6px) * 1 / 3) - 6px)
}
```

- [ ] **Step 4: Update `sizeExpressions.ts` and its tests to match the pre-cut semantics**

```ts
export function resolveSizeTokens(tokens: SizeToken[], containerPx: number, gutterPx = 0): number[] {
  return computeSplitGeometry(tokens, containerPx, gutterPx).preCutPx;
}
```

```ts
expect(resolveSizeTokens(parseSizeExpression('200px 1fr 30%', 3), 1000, 6)).toEqual([200, 506, 300]);
```

- [ ] **Step 5: Update `layoutBuilder.ts` to use the new basis expressions for row splits**

```ts
if (direction === 'row') {
  const rowBasis = buildVisibleBasisCss(sizeTokens, gutter);
  panel.style.flexGrow = '0';
  panel.style.flexShrink = '0';
  panel.style.flexBasis = rowBasis[i];
}
```

- [ ] **Step 6: Re-run the geometry and size-expression tests**

Run: `npm.cmd exec vitest run src/core/split/singleGeometry.test.ts src/core/split/sizeExpressions.test.ts`

Expected: PASS

- [ ] **Step 7: Run the build**

Run: `npm.cmd run build`

Expected: PASS

- [ ] **Step 8: Commit the single-geometry row sizing**

```bash
git add src/core/split/singleGeometry.ts src/core/split/singleGeometry.test.ts src/core/split/sizeExpressions.ts src/core/split/sizeExpressions.test.ts src/core/split/layoutBuilder.ts
git commit -m "refactor: adopt single split geometry"
```

### Task 5: Keep interactive gutters working under the new row geometry

**Files:**

- Create: `src/core/split/interactiveGutters.test.ts`
- Modify: `src/core/split/interactiveGutters.ts`
- Modify: `src/core/SplitLayoutPlugin.test.ts`

- [ ] **Step 1: Write the failing drag-math tests**

```ts
import { describe, expect, it } from 'vitest';
import { computeDraggedPairWidths } from './interactiveGutters';

describe('computeDraggedPairWidths', () => {
  it('preserves the visible total and the gutter invariant', () => {
    expect(
      computeDraggedPairWidths({
        leftVisiblePx: 194,
        rightVisiblePx: 800,
        deltaPx: 12,
        minVisiblePx: 40,
      }),
    ).toEqual({
      leftVisiblePx: 206,
      rightVisiblePx: 788,
    });
  });
});
```

- [ ] **Step 2: Run the gutter test to verify it fails**

Run: `npm.cmd exec vitest run src/core/split/interactiveGutters.test.ts`

Expected: FAIL because `computeDraggedPairWidths` does not exist yet

- [ ] **Step 3: Export drag math from `interactiveGutters.ts` and switch row dragging to explicit visible widths**

```ts
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
```

```ts
// pointermove branch in interactiveGutters.ts
const next = computeDraggedPairWidths(...);
panelWrappers[idx].style.flex = `0 0 ${next.leftVisiblePx}px`;
panelWrappers[idx + 1].style.flex = `0 0 ${next.rightVisiblePx}px`;
```

- [ ] **Step 4: Re-run the gutter and split plugin tests**

Run: `npm.cmd exec vitest run src/core/split/interactiveGutters.test.ts src/core/SplitLayoutPlugin.test.ts`

Expected: PASS

- [ ] **Step 5: Commit the gutter compatibility fix**

```bash
git add src/core/split/interactiveGutters.ts src/core/split/interactiveGutters.test.ts src/core/SplitLayoutPlugin.test.ts
git commit -m "fix: preserve interactive gutters under single geometry"
```

### Task 6: Update the demo and documentation

**Files:**

- Modify: `README.md`
- Modify: `demo/main.ts`

- [ ] **Step 1: Update README for the new public surface**

```md
- `boolean-button` is a boolean binding view rendered as a button
- `sized-button` and `boolean-button` share the same content model
- `px` and `%` in `sizes` describe pre-cut spans, not final visible box width
```

- [ ] **Step 2: Update `demo/main.ts`**

```ts
const paneButtons = new Pane({container: hostButtons, title: 'Button Extensions'});

paneButtons.addBinding(state, 'compact', {
  view: 'boolean-button',
  units: 2,
  content: {
    text: 'Compact Sliders',
    icon: {path: 'M3 8h10M5 4h6M5 12h6', viewBox: '0 0 16 16'},
  },
  contentOn: {
    text: 'Compact Sliders On',
  },
  offColor: '#607089',
  onColor: '#d97706',
});
```

```ts
// Size-expression showcase rows should include:
// equal equal equal
// 1fr 2fr
// 20 80
// 1fr 2fr 2fr
```

- [ ] **Step 3: Run the full test suite**

Run: `npm.cmd test`

Expected: PASS

- [ ] **Step 4: Run the build**

Run: `npm.cmd run build`

Expected: PASS

- [ ] **Step 5: Run the demo and perform the manual checks**

Run: `npm.cmd run demo`

Expected: local Vite server starts successfully

Manual checks:

- `Button Extensions` contains both `Compact Sliders Toggle` and the new boolean-button
- at least one boolean-button is multi-unit and shows icon + text
- `20 80` and `1fr 2fr 2fr` align at the first divider
- split full-row buttons remain visually flush with native full-width button edges

- [ ] **Step 6: Commit the docs and demo updates**

```bash
git add README.md demo/main.ts
git commit -m "docs: add boolean button and split geometry examples"
```

### Task 7: Final verification and handoff

**Files:**

- Modify: `docs/superpowers/plans/2026-04-05-boolean-button-single-geometry.md`

- [ ] **Step 1: Run the full verification sequence**

Run: `npm.cmd test`

Expected: PASS

Run: `npm.cmd run build`

Expected: PASS

- [ ] **Step 2: Record final manual checks in this plan**

```md
Completed manual checks on YYYY-MM-DD:

- [ ] `Button Extensions` shows the new boolean-button beside `Compact Sliders Toggle`
- [ ] multi-unit icon + text boolean-button renders correctly
- [ ] `20 80` aligns with `1fr 2fr 2fr`
- [ ] split full-row buttons remain flush with native button edges
```

- [ ] **Step 3: Mark completed steps in this plan document**

```md
- [x] Step complete
```

- [ ] **Step 4: Commit the final verification state**

```bash
git add docs/superpowers/plans/2026-04-05-boolean-button-single-geometry.md
git commit -m "chore: record boolean button verification"
```

## Execution Record

Completed on 2026-04-05 in `G:\BProj\ECGsplitter2\.worktrees\boolean-button-single-geometry`.

- [x] Task 1 through Task 5 were completed and committed as `f9c1f8e`, `78dd060`, `cde0db5`, `e86d452`, and `1645ae6`
- [x] Task 6 demo and README updates were completed and committed as `4e51dd5`
- [x] Split-root native inset alignment and default gutter unification were completed and committed as `91322b4`
- [x] Final `npm.cmd test` verification passed with 11 files and 32 tests
- [x] Final `npm.cmd run build` verification passed and emitted the library bundles plus declarations
- [x] `npm.cmd run demo` started successfully during headless Chrome verification
- [x] `Button Extensions` contains the compact slider toggle and boolean-button examples
- [x] A multi-unit icon + text boolean-button renders in the demo
- [x] `20 80` aligns with `1fr 2fr 2fr` at the first divider under the single-geometry model
- [x] Split full-row buttons are visually flush with native full-width button edges after restoring the native horizontal inset scale
