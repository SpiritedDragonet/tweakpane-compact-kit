# Split Layout Vertical Units Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace split-layout's mixed vertical sizing behavior with the approved `units` model, remove `height` / `rowUnits`, and make adaptive vertical growth work predictably for nested layouts, folders, unknown controls, and interactive gutters.

**Architecture:** Keep the already-approved horizontal `sizes` geometry intact and isolate the new work around a vertical unit model. First shrink the public surface so only `units` remains, then add a pure unit-runtime helper that computes `baseUnits` / `liveUnits`, and finally wire that helper into `layoutBuilder` and interactive gutters so adaptive height changes propagate upward through nested `row` / `column` trees instead of being patched ad hoc in DOM observers.

**Tech Stack:** TypeScript, Tweakpane v4, Vitest, JSDOM, Vite

---

## Preflight Notes

- Execute this plan in `G:\BProj\ECGsplitter2\.worktrees\boolean-button-single-geometry`.
- The worktree is currently dirty in split-layout runtime files. Treat the existing uncommitted vertical-height attempt as reference only; do not preserve behavior that conflicts with [2026-04-06-split-layout-vertical-units-design.md](G:\BProj\ECGsplitter2\.worktrees\boolean-button-single-geometry\docs\superpowers\specs\2026-04-06-split-layout-vertical-units-design.md).
- The horizontal single-geometry work is already accepted. Do not reopen `sizes` math beyond whatever is required to keep tests passing.
- Remove legacy vertical syntax directly. `height` and `rowUnits` should throw instead of silently mapping forward.
- Prefer pure unit arithmetic first. Only unknown/adaptive content should use measurement fallback.
- If `src/core/split/columnUnits.ts` and `src/core/split/columnUnits.test.ts` still exist locally as untracked WIP, either delete them or fold their logic into the new tracked unit-model module before committing Task 2.

## File Map

**Create**

- `src/core/split/unitModel.ts`
  - Pure vertical helpers for `baseUnits`, `liveUnits`, quantization, empty/hidden behavior, and pixel span conversion.
- `src/core/split/unitModel.test.ts`
  - Pure tests for recursive unit propagation and quantization policy.
- `src/core/split/params.test.ts`
  - Focused parameter-normalization tests after `rowUnits` retirement.

**Modify**

- `src/core/SplitLayoutPlugin.ts`
  - Remove `height` / `rowUnits` from public types, add `units`, and keep slot/category API unchanged.
- `src/core/SplitLayoutPlugin.test.ts`
  - Replace legacy height tests with integration coverage for `units`, nested propagation, hidden nodes, and custom-host fallback.
- `src/core/split/params.ts`
  - Reject legacy fields, normalize `units`, keep `sizes`, `gutter`, `interactive`, and `compactSliders`.
- `src/core/split/layoutBuilder.ts`
  - Build and maintain vertical runtime state from `unitModel.ts`, propagate nested live-unit changes upward, and keep row geometry untouched.
- `src/core/split/interactiveGutters.ts`
  - Make vertical dragging write session-only temporary `baseUnits` instead of mutating old `rowUnits` arrays.
- `src/core/split/interactiveGutters.test.ts`
  - Update drag tests to cover session-baseline behavior.
- `src/core/shared/measure.ts`
  - Reuse existing measurement primitives if needed for unknown-control fallback; do not grow this into a second layout model.
- `README.md`
  - Replace `rowUnits` / `height` docs with `units`, `custom control host`, and `safe` / `tight` measurement language.
- `demo/main.ts`
  - Remove legacy vertical examples, use `units`, and keep the current button/compact-slider demos working under the new runtime.

**Delete**

- `src/core/split/rowUnits.ts`
  - Legacy parser that should disappear once `rowUnits` is retired.
- `src/core/split/rowUnits.test.ts`
  - Legacy tests whose meaning becomes misleading after the API removal.

### Task 1: Retire legacy vertical API and normalize `units`

**Files:**

- Create: `src/core/split/params.test.ts`
- Modify: `src/core/SplitLayoutPlugin.ts`
- Modify: `src/core/split/params.ts`
- Delete: `src/core/split/rowUnits.ts`
- Delete: `src/core/split/rowUnits.test.ts`

- [ ] **Step 1: Write the failing parameter tests**

```ts
import { describe, expect, it } from 'vitest';
import { normalizeSplitParams } from './params';

describe('normalizeSplitParams', () => {
  it('rejects retired height and rowUnits fields', () => {
    expect(() =>
      normalizeSplitParams({
        view: 'split-layout',
        direction: 'column',
        rowUnits: '1 1 2',
      } as any),
    ).toThrow(/rowUnits/i);

    expect(() =>
      normalizeSplitParams({
        view: 'split-layout',
        direction: 'row',
        height: 240,
      } as any),
    ).toThrow(/height/i);
  });

  it('normalizes units as the only vertical baseline field', () => {
    expect(
      normalizeSplitParams({
        view: 'split-layout',
        direction: 'column',
        units: 3,
        children: ['alpha'],
      } as any),
    ).toMatchObject({
      direction: 'column',
      units: 3,
      children: ['alpha'],
    });
  });
});
```

- [ ] **Step 2: Run the parameter test to verify it fails**

Run: `npm.cmd exec vitest run src/core/split/params.test.ts`

Expected: FAIL because `normalizeSplitParams()` still accepts `rowUnits` / `height` and does not normalize `units`.

- [ ] **Step 3: Update public types and parameter normalization**

```ts
export type SplitLayoutNode =
  | string
  | {
      view: 'split-layout';
      direction: SplitDirection;
      sizes?: SizeExpression;
      units?: number;
      children: SplitLayoutNode[];
      gutter?: number | string;
      minSize?: number;
      interactive?: boolean;
      compactSliders?: boolean;
    };

export type NormalizedSplitLayoutParams = {
  view: 'split-layout';
  direction: SplitDirection;
  sizes: SizeToken[];
  children: SplitLayoutNode[];
  units: number;
  gutter: number;
  minSize: number;
  interactive: boolean;
  compactSliders: boolean;
};

if ('rowUnits' in input) {
  throw new Error('`rowUnits` has been retired; use `units`.');
}
if ('height' in input) {
  throw new Error('`height` has been retired; use `units` and adaptive content.');
}
```

- [ ] **Step 4: Re-run the parameter test**

Run: `npm.cmd exec vitest run src/core/split/params.test.ts`

Expected: PASS

- [ ] **Step 5: Commit the API cleanup**

```bash
git add src/core/SplitLayoutPlugin.ts src/core/split/params.ts src/core/split/params.test.ts
git rm src/core/split/rowUnits.ts src/core/split/rowUnits.test.ts
git commit -m "refactor: retire legacy split vertical fields"
```

### Task 2: Add a pure vertical unit model

**Files:**

- Create: `src/core/split/unitModel.ts`
- Create: `src/core/split/unitModel.test.ts`

- [ ] **Step 1: Write the failing pure unit-model tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  computeMeasuredUnits,
  computeNodeLiveUnits,
  computeSpanHeightPx,
  type UnitNode,
} from './unitModel';

describe('computeNodeLiveUnits', () => {
  it('uses max for rows and sum for columns', () => {
    const row: UnitNode = {
      kind: 'row',
      baseUnits: 3,
      children: [
        {kind: 'fixed', baseUnits: 2, liveUnits: 2},
        {kind: 'fixed', baseUnits: 5, liveUnits: 5},
      ],
    };
    const column: UnitNode = {
      kind: 'column',
      baseUnits: 1,
      children: [
        {kind: 'fixed', baseUnits: 2, liveUnits: 2},
        {kind: 'fixed', baseUnits: 3, liveUnits: 3},
      ],
    };

    expect(computeNodeLiveUnits(row)).toBe(5);
    expect(computeNodeLiveUnits(column)).toBe(5);
  });

  it('treats empty and hidden nodes as zero current demand', () => {
    expect(computeNodeLiveUnits({kind: 'empty', baseUnits: 0})).toBe(0);
    expect(
      computeNodeLiveUnits({kind: 'adaptive', baseUnits: 2, hidden: true, liveUnits: 4}),
    ).toBe(0);
  });
});

describe('computeMeasuredUnits', () => {
  it('defaults to safe upward quantization', () => {
    expect(computeMeasuredUnits(19, 18, 4, 'safe')).toBe(2);
    expect(computeMeasuredUnits(19, 18, 4, 'tight')).toBe(1);
  });
});

describe('computeSpanHeightPx', () => {
  it('keeps multi-unit spans and external gutters in one formula', () => {
    expect(computeSpanHeightPx(3, 18, 4)).toBe(62);
  });
});
```

- [ ] **Step 2: Run the pure unit-model test to verify it fails**

Run: `npm.cmd exec vitest run src/core/split/unitModel.test.ts`

Expected: FAIL with `Cannot find module './unitModel'`

- [ ] **Step 3: Implement `unitModel.ts`**

```ts
export type UnitQuantization = 'safe' | 'tight';

export type UnitNode =
  | {kind: 'empty'; baseUnits: 0; hidden?: boolean}
  | {kind: 'fixed'; baseUnits: number; liveUnits?: number; hidden?: boolean}
  | {kind: 'adaptive'; baseUnits: number; liveUnits?: number; hidden?: boolean}
  | {kind: 'row'; baseUnits: number; children: UnitNode[]; hidden?: boolean}
  | {kind: 'column'; baseUnits: number; children: UnitNode[]; hidden?: boolean};

export function computeSpanHeightPx(units: number, unitPx: number, gutterPx: number): number {
  const safeUnits = Math.max(0, Math.floor(units || 0));
  if (safeUnits <= 0) return 0;
  return safeUnits * unitPx + Math.max(0, safeUnits - 1) * gutterPx;
}

export function computeMeasuredUnits(
  heightPx: number,
  unitPx: number,
  gutterPx: number,
  strategy: UnitQuantization = 'safe',
): number {
  const raw = (Math.max(0, heightPx) + gutterPx) / Math.max(1, unitPx + gutterPx);
  return strategy === 'tight'
    ? Math.max(1, Math.round(raw))
    : Math.max(1, Math.ceil(raw));
}

export function computeNodeLiveUnits(node: UnitNode): number {
  if (node.hidden) return 0;
  if (node.kind === 'empty') return 0;
  if (node.kind === 'fixed') return Math.max(0, node.baseUnits);
  if (node.kind === 'adaptive') return Math.max(node.baseUnits, node.liveUnits ?? node.baseUnits);
  if (node.kind === 'row') {
    return Math.max(node.baseUnits, ...node.children.map(computeNodeLiveUnits), 0);
  }
  return Math.max(
    node.baseUnits,
    node.children.map(computeNodeLiveUnits).reduce((sum, value) => sum + value, 0),
  );
}
```

- [ ] **Step 4: Re-run the pure unit-model test**

Run: `npm.cmd exec vitest run src/core/split/unitModel.test.ts`

Expected: PASS

- [ ] **Step 5: Commit the pure vertical model**

```bash
git add src/core/split/unitModel.ts src/core/split/unitModel.test.ts
git commit -m "refactor: add split vertical unit model"
```

### Task 3: Rebuild split runtime around `baseUnits` / `liveUnits`

**Files:**

- Modify: `src/core/split/layoutBuilder.ts`
- Modify: `src/core/SplitLayoutPlugin.test.ts`
- Modify: `src/core/shared/measure.ts`

- [ ] **Step 1: Write the failing split integration tests**

```ts
it('uses units as a baseline for column roots and grows to child demand', async () => {
  const { api } = createSplitFixture({
    direction: 'column',
    units: 3,
    children: [
      'alpha',
      {
        view: 'split-layout',
        direction: 'row',
        units: 4,
        children: ['beta', 'gamma'],
      },
    ],
  });

  const root = api.controller.view.element as HTMLElement;
  await waitForMacrotask();
  expect(root.style.height).toBe('84px');
});

it('lets hidden nodes stop contributing liveUnits without losing baseUnits', async () => {
  const { api } = createSplitFixture({
    direction: 'column',
    units: 1,
    children: ['alpha', 'beta'],
  });

  const [, beta] = api.getSlots() as HTMLElement[];
  beta.style.display = 'none';
  beta.dispatchEvent(new Event('split-layout-refresh'));
  await waitForMacrotask();

  const root = api.controller.view.element as HTMLElement;
  expect(root.style.height).toBe('18px');
});

it('treats an unknown custom host as adaptive measured content', async () => {
  const { api } = createSplitFixture({
    direction: 'column',
    children: ['host'],
  });

  const [slot] = api.getSlots() as HTMLElement[];
  const box = document.createElement('div');
  box.style.height = '62px';
  slot.appendChild(box);
  await waitForMacrotask();

  const root = api.controller.view.element as HTMLElement;
  expect(root.style.height).toBe('62px');
});
```

- [ ] **Step 2: Run the split integration tests to verify they fail**

Run: `npm.cmd exec vitest run src/core/SplitLayoutPlugin.test.ts`

Expected: FAIL because the runtime still depends on `rowUnits` / `height` and does not propagate nested adaptive live units.

- [ ] **Step 3: Rework `layoutBuilder.ts` around runtime unit state**

```ts
type RuntimeNode = {
  kind: 'row' | 'column' | 'fixed' | 'adaptive' | 'empty';
  baseUnits: number;
  liveUnits: number;
  hidden: boolean;
  children: RuntimeNode[];
  element: HTMLElement;
  panel?: HTMLElement;
  setMeasuredUnits?: (nextUnits: number) => void;
  setBaseUnits?: (nextUnits: number) => void;
};

function refreshRuntimeTree(rootNode: RuntimeNode, unitPx: number, gutterPx: number) {
  rootNode.liveUnits = computeNodeLiveUnits(rootNode);
  applyRuntimeHeights(rootNode, unitPx, gutterPx);
}

function attachAdaptiveMeasurement(node: RuntimeNode, target: HTMLElement) {
  const ro = new ResizeObserver(() => {
    const measured = computeMeasuredUnits(target.getBoundingClientRect().height, unitPx, gutterPx, 'safe');
    node.setMeasuredUnits?.(measured);
    refreshRuntimeTree(rootNode, unitPx, gutterPx);
  });
}
```

- [ ] **Step 4: Re-run the split integration tests**

Run: `npm.cmd exec vitest run src/core/SplitLayoutPlugin.test.ts`

Expected: PASS

- [ ] **Step 5: Commit the runtime rewrite**

```bash
git add src/core/split/layoutBuilder.ts src/core/SplitLayoutPlugin.test.ts src/core/shared/measure.ts
git commit -m "refactor: drive split layout height from live units"
```

### Task 4: Make interactive gutters update session baselines

**Files:**

- Modify: `src/core/split/interactiveGutters.ts`
- Modify: `src/core/split/interactiveGutters.test.ts`
- Modify: `src/core/split/layoutBuilder.ts`

- [ ] **Step 1: Write the failing gutter tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  computeDraggedColumnPairUnits,
  commitDraggedBaseUnits,
} from './interactiveGutters';

describe('commitDraggedBaseUnits', () => {
  it('stores the dragged result as the session baseline', () => {
    expect(
      commitDraggedBaseUnits({
        leftBaseUnits: 3,
        rightBaseUnits: 5,
        leftLiveUnits: 4,
        rightLiveUnits: 5,
        nextLeftUnits: 6,
        nextRightUnits: 3,
      }),
    ).toEqual({
      leftBaseUnits: 6,
      rightBaseUnits: 3,
    });
  });
});

describe('computeDraggedColumnPairUnits', () => {
  it('still converts drag distance in whole unit tracks', () => {
    expect(
      computeDraggedColumnPairUnits({
        leftUnits: 2,
        rightUnits: 4,
        deltaPx: 23,
        unitPx: 18,
        gutterPx: 4,
      }),
    ).toEqual({leftUnits: 3, rightUnits: 3});
  });
});
```

- [ ] **Step 2: Run the gutter test to verify it fails**

Run: `npm.cmd exec vitest run src/core/split/interactiveGutters.test.ts`

Expected: FAIL because no helper currently commits dragged unit spans as the new session baseline.

- [ ] **Step 3: Update vertical gutter wiring**

```ts
export function commitDraggedBaseUnits(args: {
  leftBaseUnits: number;
  rightBaseUnits: number;
  leftLiveUnits: number;
  rightLiveUnits: number;
  nextLeftUnits: number;
  nextRightUnits: number;
}) {
  return {
    leftBaseUnits: Math.max(0, args.nextLeftUnits),
    rightBaseUnits: Math.max(0, args.nextRightUnits),
  };
}

if (direction === 'column') {
  const next = computeDraggedColumnPairUnits(...);
  const committed = commitDraggedBaseUnits(...);
  leftNode.setBaseUnits?.(committed.leftBaseUnits);
  rightNode.setBaseUnits?.(committed.rightBaseUnits);
  refreshRuntimeTree(rootNode, unitPx, gutterPx);
}
```

- [ ] **Step 4: Re-run the gutter test**

Run: `npm.cmd exec vitest run src/core/split/interactiveGutters.test.ts`

Expected: PASS

- [ ] **Step 5: Commit the gutter baseline behavior**

```bash
git add src/core/split/interactiveGutters.ts src/core/split/interactiveGutters.test.ts src/core/split/layoutBuilder.ts
git commit -m "feat: persist split gutter baselines for the session"
```

### Task 5: Refresh docs, demo, and final regression coverage

**Files:**

- Modify: `README.md`
- Modify: `demo/main.ts`
- Modify: `src/core/SplitLayoutPlugin.test.ts`

- [ ] **Step 1: Write the failing doc/demo regression checks**

```ts
it('rejects legacy rowUnits in public examples', () => {
  expect(readmeText).not.toMatch(/rowUnits/);
  expect(readmeText).not.toMatch(/height: row height/);
  expect(readmeText).toMatch(/custom control host/);
  expect(readmeText).toMatch(/safe/);
});
```

Use a lightweight string assertion helper only if the repo already has one; otherwise keep this as a manual review item and let the code test target the runtime behavior instead.

- [ ] **Step 2: Update README and demo examples**

```ts
const column = pane.addBlade({
  view: 'split-layout',
  direction: 'column',
  units: 3,
  children: [
    'controls',
    {
      view: 'split-layout',
      direction: 'row',
      units: 4,
      children: ['left', 'right'],
    },
  ],
});
```

Document:

- `units` as the only vertical field
- `custom control host` terminology
- `safe` / `tight` measured fallback
- direct retirement of `rowUnits` / `height`

- [ ] **Step 3: Run targeted tests plus a build**

Run: `npm.cmd exec vitest run src/core/split/params.test.ts src/core/split/unitModel.test.ts src/core/split/interactiveGutters.test.ts src/core/SplitLayoutPlugin.test.ts`

Expected: PASS

Run: `npm.cmd run build`

Expected: PASS with updated library output in `dist/`

- [ ] **Step 4: Manually verify the demo**

Run: `npm.cmd run demo`

Expected:

- the demo boots
- no README/demo example still uses `rowUnits` or `height`
- nested vertical layouts grow/shrink naturally
- the existing compact-slider / boolean-button area still looks sane

- [ ] **Step 5: Commit docs and regression updates**

```bash
git add README.md demo/main.ts src/core/SplitLayoutPlugin.test.ts
git commit -m "docs: document split vertical units model"
```
