# Compact Kit Maintainability Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `tweakpane-compact-kit` so documented split-layout syntax remains supported while semantics become explicit, hidden behaviors are removed, compact hacks are isolated, and layout sanity checks cover slider/value/title positioning.

**Architecture:** Split the current monolithic `SplitLayoutPlugin` into focused parser, params, builder, gutter, hack, and measurement modules. Keep the public plugin surface stable, but route all documented sizing syntax through explicit parsers, move compact-slider DOM manipulation into a dedicated hack module, and cover the refactor with Vitest + JSDOM tests plus geometry-based sanity assertions.

**Tech Stack:** TypeScript, Vite, Tweakpane v4, Vitest, JSDOM

---

## Preflight Notes

- Execute this plan in a dedicated worktree. The current checkout already has unrelated user changes in `demo/main.ts`, and those must not be overwritten.
- Keep the public package entry points stable unless a task explicitly says otherwise.
- Do not reintroduce undocumented aliases such as `gap` or hidden shim APIs such as `addSplitLayout()`.

## File Map

**Create**

- `vitest.config.ts`
  - Vitest configuration using the JSDOM environment.
- `src/test/setup.ts`
  - Shared DOM/setup shims for unit tests.
- `src/test/smoke.test.ts`
  - Minimal passing test that proves the harness is wired before feature tests are added.
- `src/core/shared/measure.ts`
  - Shared helpers for reading `--cnt-usz`, probe measurement, and element-local geometry helpers.
- `src/core/shared/measure.test.ts`
  - Unit coverage for measurement fallbacks and CSS variable parsing.
- `src/core/split/sizeExpressions.ts`
  - Parser and resolver for documented `sizes` syntax.
- `src/core/split/sizeExpressions.test.ts`
  - Tests for `number[]`, `'equal'`, `fr`, and documented mixed strings.
- `src/core/split/rowUnits.ts`
  - Parser for unit-specific `rowUnits`.
- `src/core/split/rowUnits.test.ts`
  - Tests for accepted and rejected `rowUnits` syntax.
- `src/core/split/params.ts`
  - Validation and normalization of supported split-layout params.
- `src/core/split/layoutBuilder.ts`
  - DOM builder for split containers, leaves, and nested layouts.
- `src/core/split/interactiveGutters.ts`
  - Pointer handling and gutter refresh logic.
- `src/core/hacks/compactSliderPatch.ts`
  - Compact slider DOM patch and cleanup lifecycle.
- `src/core/hacks/compactSliderSanity.ts`
  - Geometry-based sanity helpers for compact slider layout checks.
- `src/core/hacks/compactSliderPatch.test.ts`
  - Sanity tests for slider/value/title relationships.
- `src/core/SplitLayoutPlugin.test.ts`
  - Integration-level behavior tests for documented split-layout semantics.

**Modify**

- `package.json`
  - Add `test` script and Vitest/JSDOM dev dependencies.
- `src/core/SplitLayoutPlugin.ts`
  - Reduce to composition layer, remove hidden behavior, wire extracted modules.
- `src/core/SizedButtonPlugin.ts`
  - Use shared measurement helper.
- `src/index.ts`
  - Keep exports aligned if internal modules move shared types.
- `README.md`
  - Align public semantics and note supported syntax.
- `API.md`
  - Update `height`, `rowUnits`, and removed hidden behaviors.
- `demo/main.ts`
  - Remove ghost params and keep demo usage aligned with the supported surface.

### Task 1: Add the test harness and baseline geometry utilities

**Files:**

- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/test/smoke.test.ts`
- Modify: `package.json`

- [x] **Step 1: Add Vitest and JSDOM to `package.json`**

```json
{
  "scripts": {
    "build": "npm run build:lib",
    "test": "vitest run"
  },
  "devDependencies": {
    "jsdom": "^24.1.3",
    "vitest": "^2.1.1"
  }
}
```

- [x] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts'],
  },
});
```

- [x] **Step 3: Create `src/test/setup.ts` with DOM shims used by Tweakpane**

```ts
import { vi } from 'vitest';

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverStub);
```

- [x] **Step 4: Create `src/test/smoke.test.ts`**

```ts
import { expect, it } from 'vitest';

it('boots the test harness', () => {
  expect(true).toBe(true);
});
```

- [x] **Step 5: Run a harness smoke check**

Run: `npm.cmd install`

Expected: lockfile updates with `vitest` and `jsdom`, install exits `0`

- [x] **Step 6: Run the test suite once**

Run: `npm.cmd test`

Expected: Vitest starts successfully and reports `1 passed`

- [x] **Step 7: Commit the harness setup**

```bash
git add package.json package-lock.json vitest.config.ts src/test/setup.ts src/test/smoke.test.ts
git commit -m "test: add vitest harness"
```

### Task 2: Extract shared measurement helpers and cover them with tests

**Files:**

- Create: `src/core/shared/measure.ts`
- Create: `src/core/shared/measure.test.ts`
- Modify: `src/core/SizedButtonPlugin.ts`
- Modify: `src/core/SplitLayoutPlugin.ts`

- [x] **Step 1: Write the failing measurement tests**

```ts
import { describe, expect, it } from 'vitest';
import { readUnitPx, measureCssUnit } from './measure';

describe('readUnitPx', () => {
  it('reads --cnt-usz from computed style', () => {
    const el = document.createElement('div');
    el.style.setProperty('--cnt-usz', '18px');
    document.body.appendChild(el);
    expect(readUnitPx(el)).toBe(18);
  });

  it('falls back to probe measurement when css var is not directly readable', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    expect(measureCssUnit(el, '--cnt-usz', 18)).toBeGreaterThan(0);
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npm.cmd exec vitest run src/core/shared/measure.test.ts`

Expected: FAIL with `Cannot find module './measure'`

- [x] **Step 3: Create `src/core/shared/measure.ts`**

```ts
export function readUnitPx(root: HTMLElement, fallback = 18): number {
  const win = root.ownerDocument?.defaultView ?? window;
  const raw = win.getComputedStyle(root).getPropertyValue('--cnt-usz').trim();
  const px = raw.match(/([0-9]+(?:\.[0-9]+)?)\s*px/i)?.[1];
  return px ? Math.max(1, Math.round(Number(px))) : fallback;
}

export function measureCssUnit(root: HTMLElement, cssVar: string, fallback = 18): number {
  const doc = root.ownerDocument;
  const probe = doc.createElement('div');
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.height = `var(${cssVar})`;
  probe.style.width = '1px';
  root.appendChild(probe);
  const px = probe.getBoundingClientRect().height || probe.offsetHeight || fallback;
  probe.remove();
  return Math.max(1, Math.round(px));
}
```

- [x] **Step 4: Replace duplicated unit probing in `src/core/SizedButtonPlugin.ts` and `src/core/SplitLayoutPlugin.ts`**

```ts
import { measureCssUnit, readUnitPx } from './shared/measure';
```

- [x] **Step 5: Re-run the measurement test**

Run: `npm.cmd exec vitest run src/core/shared/measure.test.ts`

Expected: PASS

- [x] **Step 6: Run the build to make sure imports still bundle**

Run: `npm.cmd run build`

Expected: Vite build completes successfully

- [x] **Step 7: Commit the measurement extraction**

```bash
git add src/core/shared/measure.ts src/core/shared/measure.test.ts src/core/SizedButtonPlugin.ts src/core/SplitLayoutPlugin.ts
git commit -m "refactor: extract shared measurement helpers"
```

### Task 3: Implement explicit `sizes` parsing without changing the documented surface

**Files:**

- Create: `src/core/split/sizeExpressions.ts`
- Create: `src/core/split/sizeExpressions.test.ts`
- Modify: `src/core/SplitLayoutPlugin.ts`

- [x] **Step 1: Write failing parser tests for documented `sizes` syntax**

```ts
import { describe, expect, it } from 'vitest';
import { parseSizeExpression, resolveSizeTokens } from './sizeExpressions';

describe('parseSizeExpression', () => {
  it('supports number arrays', () => {
    expect(resolveSizeTokens(parseSizeExpression([66, 34]), 1000)).toEqual([66, 34]);
  });

  it('supports equal splits', () => {
    expect(resolveSizeTokens(parseSizeExpression('equal', 3), 900)).toEqual([300, 300, 300]);
  });

  it('supports pure fr strings', () => {
    expect(resolveSizeTokens(parseSizeExpression('1fr 2fr', 2), 900)).toEqual([300, 600]);
  });

  it('supports documented mixed strings without approximation', () => {
    expect(resolveSizeTokens(parseSizeExpression('200px 1fr 30%', 3), 1000)).toEqual([200, 500, 300]);
  });
});
```

- [x] **Step 2: Run the parser test to verify it fails**

Run: `npm.cmd exec vitest run src/core/split/sizeExpressions.test.ts`

Expected: FAIL with `Cannot find module './sizeExpressions'`

- [x] **Step 3: Implement `src/core/split/sizeExpressions.ts` using token parsing**

```ts
export type SizeToken =
  | { kind: 'ratio'; value: number }
  | { kind: 'fr'; value: number }
  | { kind: 'px'; value: number }
  | { kind: 'percent'; value: number };

export function parseSizeExpression(input: number[] | string | undefined, fallbackCount = 2): SizeToken[] {
  // parse arrays, equal, fr, px, percent, and bare numbers
}

export function resolveSizeTokens(tokens: SizeToken[], containerPx: number): number[] {
  // reserve px and percent first, then distribute remaining width to ratio/fr tokens
}
```

- [x] **Step 4: Replace the old approximation-based size logic in `src/core/SplitLayoutPlugin.ts`**

```ts
const sizeTokens = parseSizeExpression(params.sizes, panelCount);
const pxSizes = resolveSizeTokens(sizeTokens, availablePx);
```

- [x] **Step 5: Re-run the parser tests**

Run: `npm.cmd exec vitest run src/core/split/sizeExpressions.test.ts`

Expected: PASS

- [x] **Step 6: Run the build**

Run: `npm.cmd run build`

Expected: PASS

- [x] **Step 7: Commit the `sizes` parser**

```bash
git add src/core/split/sizeExpressions.ts src/core/split/sizeExpressions.test.ts src/core/SplitLayoutPlugin.ts
git commit -m "refactor: add explicit size expression parser"
```

### Task 4: Give `rowUnits`, params, and `height` their own real semantics

**Files:**

- Create: `src/core/split/rowUnits.ts`
- Create: `src/core/split/rowUnits.test.ts`
- Create: `src/core/split/params.ts`
- Modify: `src/core/SplitLayoutPlugin.ts`

- [x] **Step 1: Write failing tests for `rowUnits` and rejected hidden inputs**

```ts
import { describe, expect, it } from 'vitest';
import { parseRowUnits } from './rowUnits';
import { normalizeSplitParams } from './params';

describe('parseRowUnits', () => {
  it('parses bare unit strings', () => {
    expect(parseRowUnits('1 1 2')).toEqual([1, 1, 2]);
  });

  it('parses fr unit strings', () => {
    expect(parseRowUnits('2fr 1fr 1fr')).toEqual([2, 1, 1]);
  });

  it('rejects px and percent syntax', () => {
    expect(() => parseRowUnits('40px 1fr')).toThrow(/rowUnits/i);
    expect(() => parseRowUnits('50% 50%')).toThrow(/rowUnits/i);
  });
});

describe('normalizeSplitParams', () => {
  it('rejects undocumented gap alias', () => {
    expect(() => normalizeSplitParams({ view: 'split-layout', direction: 'row', gap: 6 })).toThrow(/gutter/i);
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npm.cmd exec vitest run src/core/split/rowUnits.test.ts`

Expected: FAIL with missing module errors

- [x] **Step 3: Implement `rowUnits.ts` and `params.ts`**

```ts
export function parseRowUnits(input: number[] | string | undefined, count = 0): number[] {
  // support arrays, equal, bare unit strings, and fr strings
}

export function normalizeSplitParams(input: SplitLayoutParams): NormalizedSplitLayoutParams {
  if ('gap' in input) throw new Error('Use `gutter`; `gap` is not supported.');
  // normalize children, sizes, rowUnits, height, and feature flags
}
```

- [x] **Step 4: Update `src/core/SplitLayoutPlugin.ts` to use the new semantics**

```ts
const normalized = normalizeSplitParams(args.params);
```

- [x] **Step 5: Add or update plugin-level tests for `height` semantics**

```ts
it('derives column height from rowUnits when height is omitted', () => {
  // mount split layout, inspect root style.height
});

it('uses fixed column height when rowUnits and height are both present', () => {
  // mount split layout, inspect row sizing basis
});
```

- [x] **Step 6: Re-run the parser and semantic tests**

Run: `npm.cmd exec vitest run src/core/split/rowUnits.test.ts src/core/SplitLayoutPlugin.test.ts`

Expected: PASS

- [x] **Step 7: Commit the semantic cleanup**

```bash
git add src/core/split/rowUnits.ts src/core/split/rowUnits.test.ts src/core/split/params.ts src/core/SplitLayoutPlugin.ts src/core/SplitLayoutPlugin.test.ts
git commit -m "refactor: clarify row units and split params"
```

### Task 5: Extract layout building and interactive gutters into focused modules

**Files:**

- Create: `src/core/split/layoutBuilder.ts`
- Create: `src/core/split/interactiveGutters.ts`
- Modify: `src/core/SplitLayoutPlugin.ts`
- Modify: `src/core/SplitLayoutPlugin.test.ts`

- [x] **Step 1: Write failing integration tests for slots, categories, and disposal**

```ts
import { Pane } from 'tweakpane';
import { SplitLayoutPlugin } from './SplitLayoutPlugin';

it('returns slots in document order', () => {
  const pane = new Pane({ container: document.body });
  pane.registerPlugin(SplitLayoutPlugin);
  const api = pane.addBlade({
    view: 'split-layout',
    direction: 'row',
    children: ['alpha', 'beta', 'gamma'],
  }) as any;

  expect(api.getSlots()).toHaveLength(3);
  expect(api.getSlotsByCategory('beta')).toHaveLength(1);
});
```

- [x] **Step 2: Run the integration test to capture current behavior**

Run: `npm.cmd exec vitest run src/core/SplitLayoutPlugin.test.ts`

Expected: FAIL until the test file and extracted helpers exist

- [x] **Step 3: Move DOM creation into `layoutBuilder.ts`**

```ts
export function buildSplitLayout(doc: Document, params: NormalizedSplitLayoutParams, envEl?: HTMLElement): BuildResult {
  // create root, panels, leaves, nested splits, and cleanup hooks
}
```

- [x] **Step 4: Move gutter logic into `interactiveGutters.ts`**

```ts
export function attachInteractiveGutters(root: HTMLElement, panelWrappers: HTMLElement[], options: GutterOptions): () => void {
  // pointerdown, pointermove, pointerup, refresh
}
```

- [x] **Step 5: Reduce `src/core/SplitLayoutPlugin.ts` to composition and API exposure**

```ts
const built = buildSplitLayout(doc, normalized, hostEl);
const cleanupGutters = normalized.interactive ? attachInteractiveGutters(...) : () => {};
```

- [x] **Step 6: Re-run integration tests and full test suite**

Run: `npm.cmd test`

Expected: PASS

- [x] **Step 7: Run the build**

Run: `npm.cmd run build`

Expected: PASS

- [x] **Step 8: Commit the layout extraction**

```bash
git add src/core/split/layoutBuilder.ts src/core/split/interactiveGutters.ts src/core/SplitLayoutPlugin.ts src/core/SplitLayoutPlugin.test.ts
git commit -m "refactor: split layout builder and gutter logic"
```

### Task 6: Isolate compact slider hacks and add layout sanity monitoring

**Files:**

- Create: `src/core/hacks/compactSliderPatch.ts`
- Create: `src/core/hacks/compactSliderSanity.ts`
- Create: `src/core/hacks/compactSliderPatch.test.ts`
- Modify: `src/core/SplitLayoutPlugin.ts`

- [x] **Step 1: Write failing sanity tests for slider/value/title positioning**

```ts
import { describe, expect, it } from 'vitest';
import { assertCompactLayoutSane } from './compactSliderSanity';

it('keeps title, value text, and slider track in sane relative bounds', () => {
  const metrics = {
    labeledView: { left: 0, top: 0, right: 240, bottom: 36 },
    title: { left: 6, top: 4, right: 90, bottom: 14 },
    valueBox: { left: 80, top: 0, right: 240, bottom: 36 },
    valueText: { left: 180, top: 2, right: 230, bottom: 14 },
    sliderTrack: { left: 82, top: 18, right: 236, bottom: 30 },
  };

  expect(() => assertCompactLayoutSane(metrics)).not.toThrow();
});
```

- [x] **Step 2: Add one failing case to prove overlap detection**

```ts
it('rejects value text that spills outside the value box', () => {
  expect(() =>
    assertCompactLayoutSane({
      labeledView: { left: 0, top: 0, right: 240, bottom: 36 },
      title: { left: 6, top: 4, right: 90, bottom: 14 },
      valueBox: { left: 80, top: 0, right: 200, bottom: 36 },
      valueText: { left: 190, top: 2, right: 230, bottom: 14 },
      sliderTrack: { left: 82, top: 18, right: 196, bottom: 30 },
    })
  ).toThrow(/value/i);
});
```

- [x] **Step 3: Run the compact-slider sanity test to verify it fails**

Run: `npm.cmd exec vitest run src/core/hacks/compactSliderPatch.test.ts`

Expected: FAIL with missing module errors

- [x] **Step 4: Implement `compactSliderSanity.ts` and `compactSliderPatch.ts`**

```ts
export function assertCompactLayoutSane(metrics: CompactLayoutMetrics): void {
  // title inside labeled view
  // value text inside value box
  // slider track not overlapping value text beyond threshold
}

export function installCompactSliderPatch(root: HTMLElement, options: CompactSliderOptions): () => void {
  // mutation observer, node patching, cleanup, optional sanity callback
}
```

- [x] **Step 5: Replace inline compact-slider code in `src/core/SplitLayoutPlugin.ts`**

```ts
const cleanupCompact = installCompactSliderPatch(container, {
  enabled: params.compactSliders,
  onMetrics: collectMetrics,
});
```

- [x] **Step 6: Re-run the compact-slider test**

Run: `npm.cmd exec vitest run src/core/hacks/compactSliderPatch.test.ts`

Expected: PASS

- [x] **Step 7: Re-run the full test suite and build**

Run: `npm.cmd test`
Expected: PASS

Run: `npm.cmd run build`
Expected: PASS

- [x] **Step 8: Commit the hack isolation**

```bash
git add src/core/hacks/compactSliderPatch.ts src/core/hacks/compactSliderSanity.ts src/core/hacks/compactSliderPatch.test.ts src/core/SplitLayoutPlugin.ts
git commit -m "refactor: isolate compact slider hacks"
```

### Task 7: Remove hidden behaviors, align docs, and verify the demo

**Files:**

- Modify: `src/core/SplitLayoutPlugin.ts`
- Modify: `src/index.ts`
- Modify: `README.md`
- Modify: `API.md`
- Modify: `demo/main.ts`

- [x] **Step 1: Remove undocumented exports and hidden behaviors**

```ts
// delete addSplitLayout shim export
// reject hidden aliases and ghost params instead of silently accepting them
```

- [x] **Step 2: Update README and API docs to match the final semantics**

```md
- `rowUnits` accepts unit-like inputs only
- `height` behavior is explicitly defined for row and column modes
- `gutter` is the only supported spacing key
```

- [x] **Step 3: Clean `demo/main.ts` so it uses only the supported public surface**

```ts
const api = pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: '1fr 1fr',
  compactSliders: state.compact,
  children: ['leaf', 'leaf'],
});
```

- [x] **Step 4: Run the targeted tests**

Run: `npm.cmd test`

Expected: PASS

- [x] **Step 5: Run the build and then the demo once**

Run: `npm.cmd run build`

Expected: PASS

Run: `npm.cmd run demo`

Expected: local dev server starts, compact slider demo still renders, and the slider/value/title layout looks sane by eye

- [x] **Step 6: Commit the public-surface cleanup**

```bash
git add src/core/SplitLayoutPlugin.ts src/index.ts README.md API.md demo/main.ts
git commit -m "docs: align compact kit public surface"
```

### Task 8: Final verification and handoff

**Files:**

- Modify: `docs/superpowers/plans/2026-04-04-compact-kit-maintainability-cleanup.md`

- [x] **Step 1: Run the full verification sequence**

Run: `npm.cmd test`
Expected: PASS

Run: `npm.cmd run build`
Expected: PASS

- [x] **Step 2: Capture any remaining manual checks**

```md
- compact slider title stays in upper-left region
- right-side numeric value stays inside the value box
- slider track does not visually collide with the numeric value
```

Completed manual checks on 2026-04-05:

- [x] compact slider title stays in upper-left region
- [x] right-side numeric value stays inside the value box
- [x] slider track does not visually collide with the numeric value
- [x] demo page served successfully after switching to a free local port because 5173 was already occupied

- [x] **Step 3: Mark completed steps in this plan document**

```md
- [x] Step complete
```

- [x] **Step 4: Commit the final verification state**

```bash
git add docs/superpowers/plans/2026-04-04-compact-kit-maintainability-cleanup.md
git commit -m "chore: record maintainability cleanup verification"
```
