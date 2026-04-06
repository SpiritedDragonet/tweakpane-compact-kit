# README and Demo Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the demo and README into one shared showcase/manual track, regenerate the committed SVG screenshots, and add lightweight automated checks so the demo structure, screenshot inventory, and README references do not drift apart again.

**Architecture:** Keep one source of truth for the approved showcase structure in `src/demo`, then let the demo shell and README tests both consume that structure. Refactor the demo into explicit section builders that match the approved README order, add a small SVG export helper for pane captures, and only then rewrite the README around the new overview/onboarding/body flow so the committed screenshots and the public manual come from the same section sequence.

**Tech Stack:** TypeScript, Vite, Vitest, JSDOM, Tweakpane v4, Markdown, committed SVG assets

---

## Preflight Notes

- The approved design is in [2026-04-07-readme-demo-showcase-design.md](G:\BProj\ECGsplitter2\docs\superpowers\specs\2026-04-07-readme-demo-showcase-design.md). Do not improvise a second content structure.
- Current demo structure is still `Basics / Button Extensions / Custom Categories`. The plan changes both naming and section boundaries.
- Current `docs/images/` assets use older names such as `basics-1.svg` and `compact-toggle.svg`. Replace them with the approved inventory rather than keeping both naming schemes alive.
- Keep the screenshots as pure pane/control captures. Do not introduce decorative wrappers just to make the README feel more "marketing".
- The demo may become slightly richer than the README, but it must not grow a second narrative track.
- Browser-based screenshot export may still require a short manual step because the final files are SVG documents generated from live DOM. The helper added in this plan is there to make that manual step repeatable.

## File Map

**Create**

- `src/demo/showcaseSections.ts`
  - One small source of truth for the approved section order, subsection keys, screenshot file names, and export target names.
- `src/demo/showcaseSections.test.ts`
  - Pure tests for section order, screenshot naming, and dual-state screenshot rules.
- `src/demo/showcaseDemo.ts`
  - Demo section builders and mount orchestration for the new shared showcase flow.
- `src/demo/showcaseDemo.test.ts`
  - DOM-level tests that assert the demo renders the approved section headings and export targets in order.
- `src/demo/readmeShowcase.test.ts`
  - Tests that assert the README headings, image references, and onboarding blocks match the approved showcase contract.
- `src/demo/exportPaneSvg.ts`
  - Small browser-side SVG serializer/downloader for README screenshot export.
- `src/demo/exportPaneSvg.test.ts`
  - Pure tests for SVG wrapper generation and export naming behavior.

**Modify**

- `demo/index.html`
  - Thin shell for the overview and the top-level demo root.
- `demo/main.ts`
  - Entry point that mounts the shared showcase demo and exposes export helpers in dev mode.
- `README.md`
  - Rewrite around `Overview`, `Split Layout`, `Button Views`, `Compact Sliders`, `Composing Layouts`, and `API Quick Reference`.
- `docs/images/*`
  - Replace the old image inventory with the approved screenshot set.

**Delete / Rename**

- Delete old screenshot files after the new inventory is committed:
  - `docs/images/basics-1.svg`
  - `docs/images/basics-2.svg`
  - `docs/images/basics-3.svg`
  - `docs/images/categories.svg`
  - `docs/images/compact-toggle (original).svg`
  - `docs/images/compact-toggle(compact).svg`
  - `docs/images/compact-toggle.svg`
  - `docs/images/gauge.svg`

### Task 1: Add a source of truth and guardrail tests for the showcase contract

**Files:**

- Create: `src/demo/showcaseSections.ts`
- Create: `src/demo/showcaseSections.test.ts`
- Create: `src/demo/readmeShowcase.test.ts`

- [ ] **Step 1: Write the failing tests for section order and README contract**

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  README_SCREENSHOT_FILES,
  SHOWCASE_SECTION_KEYS,
  SHOWCASE_SUBSECTIONS,
} from './showcaseSections';

describe('showcaseSections', () => {
  it('keeps the approved top-level section order', () => {
    expect(SHOWCASE_SECTION_KEYS).toEqual([
      'overview',
      'split-layout',
      'button-views',
      'compact-sliders',
      'composing-layouts',
      'api-quick-reference',
      'run-the-demo',
    ]);
  });

  it('keeps the approved screenshot inventory and dual-state pairs', () => {
    expect(README_SCREENSHOT_FILES).toEqual([
      'split-first-row.svg',
      'split-size-expressions.svg',
      'split-mixed-dom.svg',
      'button-boolean-off.svg',
      'button-boolean-on.svg',
      'button-sized-actions.svg',
      'compact-sliders-off.svg',
      'compact-sliders-on.svg',
      'composing-layouts.svg',
    ]);

    const paired = SHOWCASE_SUBSECTIONS.filter((entry) => entry.stateful);
    expect(paired.map((entry) => entry.key)).toEqual([
      'button-boolean',
      'compact-sliders',
    ]);
  });
});

describe('README showcase contract', () => {
  it('contains the approved section headings and image references', () => {
    const readme = readFileSync(resolve(process.cwd(), 'README.md'), 'utf8');

    expect(readme).toMatch(/^## Overview$/m);
    expect(readme).toMatch(/^## Split Layout$/m);
    expect(readme).toMatch(/^## Button Views$/m);
    expect(readme).toMatch(/^## Compact Sliders$/m);
    expect(readme).toMatch(/^## Composing Layouts$/m);
    expect(readme).toMatch(/^## API Quick Reference$/m);

    README_SCREENSHOT_FILES.forEach((file) => {
      expect(readme).toContain(`docs/images/${file}`);
    });
  });
});
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `npm.cmd exec vitest run src/demo/showcaseSections.test.ts src/demo/readmeShowcase.test.ts`

Expected: FAIL because `showcaseSections.ts` does not exist yet and the current README still uses the old section names and screenshot file names.

- [ ] **Step 3: Implement the minimal source-of-truth module**

```ts
export const SHOWCASE_SECTION_KEYS = [
  'overview',
  'split-layout',
  'button-views',
  'compact-sliders',
  'composing-layouts',
  'api-quick-reference',
  'run-the-demo',
] as const;

export const SHOWCASE_SUBSECTIONS = [
  {key: 'split-first-row', section: 'split-layout', title: 'First Split', screenshot: 'split-first-row.svg'},
  {key: 'split-size-expressions', section: 'split-layout', title: 'Size Expressions', screenshot: 'split-size-expressions.svg'},
  {key: 'split-mixed-dom', section: 'split-layout', title: 'Mixed DOM', screenshot: 'split-mixed-dom.svg'},
  {key: 'button-boolean', section: 'button-views', title: 'Boolean Button', screenshot: ['button-boolean-off.svg', 'button-boolean-on.svg'], stateful: true},
  {key: 'button-sized-actions', section: 'button-views', title: 'Sized Button', screenshot: 'button-sized-actions.svg'},
  {key: 'compact-sliders', section: 'compact-sliders', title: 'Compact Sliders', screenshot: ['compact-sliders-off.svg', 'compact-sliders-on.svg'], stateful: true},
  {key: 'composing-layouts', section: 'composing-layouts', title: 'Composing Layouts', screenshot: 'composing-layouts.svg'},
] as const;

export const README_SCREENSHOT_FILES = SHOWCASE_SUBSECTIONS.flatMap((entry) =>
  Array.isArray(entry.screenshot) ? entry.screenshot : [entry.screenshot],
);
```

- [ ] **Step 4: Re-run the focused tests**

Run: `npm.cmd exec vitest run src/demo/showcaseSections.test.ts src/demo/readmeShowcase.test.ts`

Expected: `showcaseSections.test.ts` passes and `readmeShowcase.test.ts` still fails on the old README headings and image references. That remaining failure is intentional and becomes the guardrail for Task 4.

- [ ] **Step 5: Commit the showcase contract groundwork**

```bash
git add src/demo/showcaseSections.ts src/demo/showcaseSections.test.ts src/demo/readmeShowcase.test.ts
git commit -m "test: add showcase structure guardrails"
```

### Task 2: Refactor the demo into the approved section flow

**Files:**

- Create: `src/demo/showcaseDemo.ts`
- Create: `src/demo/showcaseDemo.test.ts`
- Modify: `demo/index.html`
- Modify: `demo/main.ts`
- Modify: `src/demo/showcaseSections.ts`

- [ ] **Step 1: Write the failing demo-structure test**

```ts
import { describe, expect, it } from 'vitest';

import { mountShowcaseDemo } from './showcaseDemo';

describe('mountShowcaseDemo', () => {
  it('renders the approved top-level sections in order', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const root = document.getElementById('app') as HTMLElement;

    mountShowcaseDemo(document, root);

    const titles = Array.from(root.querySelectorAll('[data-showcase-title]')).map((el) =>
      el.textContent?.trim(),
    );
    expect(titles).toEqual([
      'Split Layout',
      'Button Views',
      'Compact Sliders',
      'Composing Layouts',
    ]);
  });
});
```

- [ ] **Step 2: Run the demo-structure test to verify it fails**

Run: `npm.cmd exec vitest run src/demo/showcaseDemo.test.ts`

Expected: FAIL with `Cannot find module './showcaseDemo'`.

- [ ] **Step 3: Implement the new demo shell and section builders**

```ts
export function mountShowcaseDemo(doc: Document, root: HTMLElement) {
  const split = createSection(root, 'Split Layout');
  mountSplitLayoutShowcase(doc, split.body);

  const buttons = createSection(root, 'Button Views');
  mountButtonViewsShowcase(doc, buttons.body);

  const compact = createSection(root, 'Compact Sliders');
  mountCompactSliderShowcase(doc, compact.body);

  const composing = createSection(root, 'Composing Layouts');
  mountComposingLayoutsShowcase(doc, composing.body);
}
```

Update the demo shell so:

- `demo/index.html` becomes a thin wrapper with an overview block and one root element
- `demo/main.ts` becomes the composition root that calls `mountShowcaseDemo(...)`
- current `Button Extensions` content is split into `Button Views` and `Compact Sliders`
- current `Custom Categories (Semantic Leaves)` becomes `Composing Layouts`
- the default rendered states match the planned screenshot inventory

- [ ] **Step 4: Re-run the demo-structure test**

Run: `npm.cmd exec vitest run src/demo/showcaseDemo.test.ts`

Expected: PASS

- [ ] **Step 5: Commit the demo restructure**

```bash
git add demo/index.html demo/main.ts src/demo/showcaseDemo.ts src/demo/showcaseDemo.test.ts src/demo/showcaseSections.ts
git commit -m "refactor: align demo with showcase structure"
```

### Task 3: Add a repeatable SVG export helper for pane screenshots

**Files:**

- Create: `src/demo/exportPaneSvg.ts`
- Create: `src/demo/exportPaneSvg.test.ts`
- Modify: `src/demo/showcaseDemo.ts`
- Modify: `demo/main.ts`

- [ ] **Step 1: Write the failing SVG export tests**

```ts
import { describe, expect, it } from 'vitest';

import { buildPaneSvgDocument } from './exportPaneSvg';

describe('buildPaneSvgDocument', () => {
  it('wraps serialized pane markup in a standalone svg document', () => {
    const host = document.createElement('div');
    host.style.width = '320px';
    host.style.height = '120px';
    host.innerHTML = '<div class="pane">demo</div>';

    const svg = buildPaneSvgDocument(document, host, {
      width: 320,
      height: 120,
      cssText: '.pane { color: white; }',
    });

    expect(svg).toContain('<svg');
    expect(svg).toContain('<foreignObject');
    expect(svg).toContain('.pane { color: white; }');
    expect(svg).toContain('class="pane"');
  });
});
```

- [ ] **Step 2: Run the SVG export test to verify it fails**

Run: `npm.cmd exec vitest run src/demo/exportPaneSvg.test.ts`

Expected: FAIL with `Cannot find module './exportPaneSvg'`.

- [ ] **Step 3: Implement the export helper and dev-only export wiring**

```ts
export function buildPaneSvgDocument(
  doc: Document,
  target: HTMLElement,
  options: {width: number; height: number; cssText: string},
) {
  const markup = target.outerHTML;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${options.width}" height="${options.height}" viewBox="0 0 ${options.width} ${options.height}">
    <foreignObject x="0" y="0" width="${options.width}" height="${options.height}">
      <div xmlns="http://www.w3.org/1999/xhtml">
        <style>${options.cssText}</style>
        ${markup}
      </div>
    </foreignObject>
  </svg>`;
}

export function installShowcaseExportApi(...) {
  (window as any).__compactKitShowcase = {
    exportAll: async () => { /* download or return all approved SVG files */ },
  };
}
```

Wire the helper into the demo so the export API can capture the exact approved
targets:

- `split-first-row`
- `split-size-expressions`
- `split-mixed-dom`
- `button-boolean-off`
- `button-boolean-on`
- `button-sized-actions`
- `compact-sliders-off`
- `compact-sliders-on`
- `composing-layouts`

- [ ] **Step 4: Re-run the SVG export test**

Run: `npm.cmd exec vitest run src/demo/exportPaneSvg.test.ts`

Expected: PASS

- [ ] **Step 5: Commit the export helper**

```bash
git add src/demo/exportPaneSvg.ts src/demo/exportPaneSvg.test.ts src/demo/showcaseDemo.ts demo/main.ts
git commit -m "feat: add demo svg export helper"
```

### Task 4: Rewrite the README and replace the screenshot inventory

**Files:**

- Modify: `README.md`
- Modify: `docs/images/*`

- [ ] **Step 1: Use the existing README contract test as the failing test**

Run: `npm.cmd exec vitest run src/demo/readmeShowcase.test.ts`

Expected: FAIL because the README still uses the old section names and image paths.

- [ ] **Step 2: Rewrite the README around the approved structure**

````md
## Overview

Compact extension kit for Tweakpane v4: split layouts, button views, and compact sliders that stay aligned with native pane geometry.

## Install

```bash
npm install tweakpane tweakpane-compact-kit
```

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
```
```

Keep all example blocks in collapsible `<details>` sections and reorganize the
body into:

- `Split Layout`
- `Button Views`
- `Compact Sliders`
- `Composing Layouts`
- `API Quick Reference`
- `Run the Demo`
````

- [ ] **Step 3: Export the new SVG screenshots and replace the old image set**

Run: `npm.cmd run demo`

Expected: the demo opens with the new section order and stable default states.

Then in the browser console use the dev export API:

```js
await window.__compactKitShowcase.exportAll();
```

Expected: downloads or returns the approved SVG files using these exact names:

- `split-first-row.svg`
- `split-size-expressions.svg`
- `split-mixed-dom.svg`
- `button-boolean-off.svg`
- `button-boolean-on.svg`
- `button-sized-actions.svg`
- `compact-sliders-off.svg`
- `compact-sliders-on.svg`
- `composing-layouts.svg`

Move the resulting files into `docs/images/` and delete the old screenshot
inventory listed in the File Map section above.

- [ ] **Step 4: Re-run the README contract test**

Run: `npm.cmd exec vitest run src/demo/readmeShowcase.test.ts`

Expected: PASS

- [ ] **Step 5: Commit the README and image refresh**

```bash
git add README.md docs/images
git commit -m "docs: rebuild README as showcase manual"
```

### Task 5: Run full verification and perform the final visual sweep

**Files:**

- Verify: `src/demo/*.test.ts`
- Verify: `README.md`
- Verify: `demo/index.html`
- Verify: `demo/main.ts`
- Verify: `docs/images/*`

- [ ] **Step 1: Run the full test suite**

Run: `npm.cmd exec vitest run`

Expected: PASS

- [ ] **Step 2: Run the library build**

Run: `npm.cmd run build`

Expected: PASS

- [ ] **Step 3: Run the demo production build**

Run: `npm.cmd exec -- vite build --config demo/vite.config.ts`

Expected: PASS

- [ ] **Step 4: Perform a manual visual smoke check**

Run: `npm.cmd run demo`

Expected:

- overview contains install + quick start + anchors
- demo section order matches the README body
- boolean and compact-slider screenshot states are easy to reproduce
- no README image reference points to a deleted asset

- [ ] **Step 5: Commit the verification-only touch-ups**

```bash
git add README.md demo/index.html demo/main.ts src/demo docs/images
git commit -m "chore: verify showcase manual refresh"
```

## Review Checklist

Before execution handoff, confirm the plan preserves all approved design points:

- one thin overview instead of a second landing page
- README and demo share the same major section order
- screenshots come from the demo sections
- onboarding includes both install and calling guidance
- code blocks remain collapsed by default
- `Composing Layouts` replaces the old semantic-leaves emphasis in public docs
