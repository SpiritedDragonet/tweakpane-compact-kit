# Demo And README Linear Handbook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reshape the live demo and README into a seven-chapter linear handbook that teaches one split-layout contract per section and keeps the screenshot/export workflow intact.

**Architecture:** Keep the chapter contract centralized in `src/demo/showcaseSections.ts`, then reshape the visible demo in `src/demo/showcaseDemo.ts` and the prose in `README.md` to follow that shared order exactly. Reuse the existing capture/export pipeline, but refresh the screenshot semantics so `Units And Height Flow`, `Custom DOM`, `Buttons`, and `Compact Sliders And Labels` stop overlapping in what they teach.

**Tech Stack:** TypeScript, Vitest, Vite, Tweakpane v4, Markdown, SVG export helpers

---

## File Map

**Modify**

- `src/demo/showcaseSections.ts`
  - Replace the current chapter taxonomy with the new seven-section handbook order and screenshot contract.
- `src/demo/showcaseSections.test.ts`
  - Lock the new chapter order and screenshot inventory.
- `src/demo/showcaseDemo.ts`
  - Rebuild the visible guided tour around the approved seven sections.
- `src/demo/showcaseDemo.test.ts`
  - Lock the visible section order, subtitles, and key example presence.
- `src/demo/readmeShowcase.test.ts`
  - Lock the README chapter order, terminology, and image references.
- `README.md`
  - Rewrite the guided-tour body around the new handbook sequence.
- `docs/images/*.svg`
  - Refresh the exported screenshots after the demo rewrite.

**Likely Modify**

- `src/demo/exportPaneSvg.ts`
  - Only if the new screenshot layout exposes an export sizing bug.
- `src/core/SplitLayoutPlugin.test.ts`
  - Add or tighten a regression test if the `Units And Height Flow` / custom-DOM separation reveals a missing row-host case.

**Verify Only**

- `demo/main.ts`
  - Capture-mode boot path should remain unchanged.
- `demo/vite.config.ts`
  - Capture-mode write endpoint should remain unchanged.
- `scripts/run-demo.mjs`
  - Demo startup path should remain unchanged.

---

### Task 1: Lock The Seven-Chapter Handbook Contract

**Files:**
- Modify: `src/demo/showcaseSections.ts`
- Modify: `src/demo/showcaseSections.test.ts`
- Modify: `src/demo/readmeShowcase.test.ts`
- Modify: `src/demo/showcaseDemo.test.ts`

- [ ] **Step 1: Rewrite the shared section-order test to expect the seven numbered chapters**

Update `src/demo/showcaseSections.test.ts` to expect this order:

```ts
expect(SHOWCASE_SECTION_KEYS).toEqual([
  'overview',
  'install',
  'quick-start',
  'first-split',
  'width-geometry',
  'units-and-height-flow',
  'custom-dom',
  'buttons',
  'compact-sliders-and-labels',
  'composing-layouts',
  'run-the-demo',
]);
```

- [ ] **Step 2: Rewrite the README contract test to expect the new numbered headings**

In `src/demo/readmeShowcase.test.ts`, add expectations like:

```ts
expect(readme).toMatch(/^## 1 First Split$/m);
expect(readme).toMatch(/^## 4 Custom DOM$/m);
expect(readme).toMatch(/^## 5 Buttons$/m);
expect(readme).toMatch(/^## 6 Compact Sliders And Labels$/m);
expect(readme).toMatch(/^## 7 Composing Layouts$/m);
```

Also assert:

```ts
expect(readme).toContain('Declared Span DOM');
expect(readme).toContain('Measured Fallback DOM');
expect(readme).not.toContain('unknown DOM');
```

- [ ] **Step 3: Rewrite the demo contract test to expect the new visible title sequence**

Update `src/demo/showcaseDemo.test.ts` to expect:

```ts
expect(titles).toEqual([
  '1 First Split',
  '2 Width Geometry',
  '3 Units And Height Flow',
  '4 Custom DOM',
  '5 Buttons',
  '6 Compact Sliders And Labels',
  '7 Composing Layouts',
]);
```

- [ ] **Step 4: Run the focused contract tests to verify they fail**

Run: `npm.cmd exec vitest run src/demo/showcaseSections.test.ts src/demo/showcaseDemo.test.ts src/demo/readmeShowcase.test.ts`

Expected: FAIL because the current section metadata, README, and visible demo still follow the older chapter layout.

- [ ] **Step 5: Update `src/demo/showcaseSections.ts` to become the single source of chapter order**

Keep this file responsible only for:

- chapter keys
- chapter titles
- screenshot inventory
- paired stateful screenshot files

Do not move mounting logic into this file.

- [ ] **Step 6: Re-run the focused contract tests**

Run: `npm.cmd exec vitest run src/demo/showcaseSections.test.ts src/demo/showcaseDemo.test.ts src/demo/readmeShowcase.test.ts`

Expected: section metadata test passes; demo and README tests still fail until their content is rewritten.

- [ ] **Step 7: Commit the shared handbook contract**

```bash
git add src/demo/showcaseSections.ts src/demo/showcaseSections.test.ts src/demo/showcaseDemo.test.ts src/demo/readmeShowcase.test.ts
git commit -m "test: lock linear handbook chapter contract"
```

### Task 2: Rebuild The Demo Around One Rule Per Section

**Files:**
- Modify: `src/demo/showcaseDemo.ts`
- Modify: `src/demo/showcaseDemo.test.ts`

- [ ] **Step 1: Add failing subtitle/content assertions for the new sections**

Extend `src/demo/showcaseDemo.test.ts` with checks like:

```ts
expect(pageText).toContain('One split root creates slots.');
expect(pageText).toContain('All row widths follow one geometry model.');
expect(pageText).toContain('Rows take the tallest visible child.');
expect(pageText).toContain('Declare the span when you know it.');
expect(pageText).toContain('Buttons share one content model.');
expect(pageText).toContain('Compact sliders only change layout treatment.');
```

- [ ] **Step 2: Run the focused demo test to verify it fails**

Run: `npm.cmd exec vitest run src/demo/showcaseDemo.test.ts`

Expected: FAIL because the current demo still renders the old structure and mixed semantics.

- [ ] **Step 3: Rebuild `1 First Split` as the minimal structural example**

In `src/demo/showcaseDemo.ts`, keep only:

- one split root
- one wrapped child pane
- one plain DOM host

Avoid folders, boolean-button state, and slider examples in this section.

- [ ] **Step 4: Rebuild `2 Width Geometry` as width-only examples**

Keep exactly these visible rows:

- `equal`
- `2fr 1fr`
- `20% 80%`
- `200px 1fr 30%`

Remove the extra width row whose teaching value duplicates the others.

- [ ] **Step 5: Rebuild `3 Units And Height Flow` without custom DOM**

Use:

- left: a control column with baseline units plus a folder that can expand
- right: a gray dashed `4u` placeholder box with neutral copy

Do not mount the old gauge/custom DOM example here.

- [ ] **Step 6: Rebuild `4 Custom DOM` as a side-by-side declared-vs-measured example**

Use one visible comparison:

- `Declared Span DOM`
- `Measured Fallback DOM`

Make the measured side visibly taller because of its content so the fallback is obvious.

- [ ] **Step 7: Rebuild `5 Buttons` as one merged button-content chapter**

Show in one section:

- boolean-button semantics
- sized-button semantics
- text-only content
- icon-only content
- mixed icon+text content
- boolean on-state

Do not split these into separate visible demo chapters.

- [ ] **Step 8: Rebuild `6 Compact Sliders And Labels` as a slider-only chapter**

Show:

- native vs compact comparison
- split-leaf compact slider alignment

Keep buttons out of the visual teaching surface for this section, except for any minimal internal toggle needed by the demo.

- [ ] **Step 9: Keep `7 Composing Layouts` as the final integration proof**

Retain the integrated example, but do not use it to teach new concepts that belong in earlier sections.

- [ ] **Step 10: Re-run the focused demo test**

Run: `npm.cmd exec vitest run src/demo/showcaseDemo.test.ts`

Expected: PASS

- [ ] **Step 11: Commit the demo rewrite**

```bash
git add src/demo/showcaseDemo.ts src/demo/showcaseDemo.test.ts
git commit -m "feat: rebuild demo as linear handbook"
```

### Task 3: Rewrite README.md To Match The Demo Exactly

**Files:**
- Modify: `README.md`
- Modify: `src/demo/readmeShowcase.test.ts`

- [ ] **Step 1: Expand the README contract test with the new chapter-specific phrases**

Add expectations that the README includes:

```ts
expect(readme).toContain('Declared Span DOM');
expect(readme).toContain('Measured Fallback DOM');
expect(readme).toContain('row nodes resolve to the tallest visible child');
expect(readme).toContain('column nodes resolve to the sum of visible children');
expect(readme).toContain('Buttons share one content model');
expect(readme).toContain('compactSliders changes layout treatment only');
```

- [ ] **Step 2: Run the focused README contract test to verify it fails**

Run: `npm.cmd exec vitest run src/demo/readmeShowcase.test.ts`

Expected: FAIL because the README still follows the older chapter grouping and terminology.

- [ ] **Step 3: Rewrite the README chapters in the approved seven-section order**

Keep:

- `Overview`
- `Install`
- `Quick Start`
- `Run the Demo`

Rewrite the numbered body as:

- `## 1 First Split`
- `## 2 Width Geometry`
- `## 3 Units And Height Flow`
- `## 4 Custom DOM`
- `## 5 Buttons`
- `## 6 Compact Sliders And Labels`
- `## 7 Composing Layouts`

- [ ] **Step 4: Give each chapter one image, one or two paragraphs, and one `View code` block**

Do not create nested top-level subsections that reintroduce a second chapter hierarchy.

- [ ] **Step 5: Make the prose explain the real contracts directly**

Required content:

- structural split semantics
- single-geometry width model
- `units` baseline model
- row = max, column = sum
- declared span before measured fallback
- measured fallback as a fallback, not a peer recommendation
- shared button content model
- boolean vs action semantics
- compact slider layout-only treatment
- label/inset normalization inside wrapped split leaves

- [ ] **Step 6: Re-run the focused README contract test**

Run: `npm.cmd exec vitest run src/demo/readmeShowcase.test.ts`

Expected: PASS

- [ ] **Step 7: Commit the README rewrite**

```bash
git add README.md src/demo/readmeShowcase.test.ts
git commit -m "docs: rewrite readme as linear handbook"
```

### Task 4: Tighten The DOM And Height-Flow Example Semantics

**Files:**
- Modify: `src/demo/showcaseDemo.ts`
- Likely Modify: `src/core/SplitLayoutPlugin.test.ts`

- [ ] **Step 1: Add a focused regression test if the new demo shape exposes a row-host gap**

If needed, add a targeted case in `src/core/SplitLayoutPlugin.test.ts` for a row split whose right leaf hosts measured DOM while the left leaf changes live units.

Use a small pattern like:

```ts
const { api } = createSplitFixture({
  direction: 'row',
  children: ['left', 'right'],
});
```

Then assert that the row height follows the maximum live child demand.

- [ ] **Step 2: Run the focused split-layout test to verify the failure before any fix**

Run: `npm.cmd exec vitest run src/core/SplitLayoutPlugin.test.ts`

Expected: only if the new regression was added and fails for the expected reason.

- [ ] **Step 3: Fix the demo helpers so declared DOM and measured DOM are demonstrated intentionally**

In `src/demo/showcaseDemo.ts`:

- declared-span DOM should publish its intended units explicitly
- measured fallback DOM should be left undeclared on purpose
- the `Units And Height Flow` placeholder should be purely geometric, not another DOM-contract example

- [ ] **Step 4: Re-run the focused split-layout test if one was added**

Run: `npm.cmd exec vitest run src/core/SplitLayoutPlugin.test.ts`

Expected: PASS

- [ ] **Step 5: Re-run the focused demo test**

Run: `npm.cmd exec vitest run src/demo/showcaseDemo.test.ts`

Expected: PASS

- [ ] **Step 6: Commit the DOM/height-flow cleanup**

```bash
git add src/demo/showcaseDemo.ts src/core/SplitLayoutPlugin.test.ts
git commit -m "fix: separate dom semantics from height-flow demo"
```

### Task 5: Refresh The Screenshot Inventory

**Files:**
- Modify/Overwrite: `docs/images/split-first-row.svg`
- Modify/Overwrite: `docs/images/split-size-expressions.svg`
- Modify/Overwrite: `docs/images/split-mixed-dom.svg`
- Modify/Overwrite: `docs/images/button-boolean-off.svg`
- Modify/Overwrite: `docs/images/button-boolean-on.svg`
- Modify/Overwrite: `docs/images/button-sized-actions.svg`
- Modify/Overwrite: `docs/images/compact-sliders-off.svg`
- Modify/Overwrite: `docs/images/compact-sliders-on.svg`
- Modify/Overwrite: `docs/images/composing-layouts.svg`

- [ ] **Step 1: Run the focused demo and README tests before exporting images**

Run: `npm.cmd exec vitest run src/demo/showcaseDemo.test.ts src/demo/readmeShowcase.test.ts src/demo/showcaseSections.test.ts`

Expected: PASS

- [ ] **Step 2: Start the live demo**

Run: `npm.cmd run demo`

Open: `http://127.0.0.1:5173/?capture=1`

- [ ] **Step 3: Export the README SVGs from the live page**

Use the `Export README SVGs` button.

Expected status: success message showing all approved SVGs were written.

- [ ] **Step 4: Inspect the regenerated screenshots**

Review at least:

- `docs/images/split-mixed-dom.svg`
- `docs/images/button-boolean-on.svg`
- `docs/images/compact-sliders-on.svg`
- `docs/images/composing-layouts.svg`

Confirm:

- each image matches its chapter's single teaching goal
- `Custom DOM` clearly shows declared vs measured contrast
- `Units And Height Flow` no longer looks like a custom DOM contract example

- [ ] **Step 5: Re-run the README contract test after export**

Run: `npm.cmd exec vitest run src/demo/readmeShowcase.test.ts`

Expected: PASS

- [ ] **Step 6: Commit the refreshed screenshots**

```bash
git add docs/images
git commit -m "docs: refresh linear handbook screenshots"
```

### Task 6: Final Verification

**Files:**
- Verify: `README.md`
- Verify: `src/demo/showcaseSections.ts`
- Verify: `src/demo/showcaseDemo.ts`
- Verify: `docs/images/*.svg`
- Verify: `demo/main.ts`
- Verify: `demo/vite.config.ts`

- [ ] **Step 1: Run the full test suite**

Run: `npm.cmd exec vitest run`

Expected: PASS

- [ ] **Step 2: Run the library build**

Run: `npm.cmd run build`

Expected: PASS

- [ ] **Step 3: Run the demo build path**

Run: `node scripts/run-demo.mjs --capture`

Expected: library build succeeds, then the demo server starts in the current CLI; if port `5173` is busy, free it and rerun.

- [ ] **Step 4: Perform a live smoke pass**

Verify manually:

- the visible demo shows the seven numbered sections
- the README headings match the same order
- capture mode still works
- screenshots overwrite the approved files only

- [ ] **Step 5: Inspect the final worktree**

Run: `git status --short`

Expected: only intended tracked changes remain.

- [ ] **Step 6: Commit the final integrated pass**

```bash
git add README.md src demo docs/images
git commit -m "feat: align demo and readme as linear handbook"
```
