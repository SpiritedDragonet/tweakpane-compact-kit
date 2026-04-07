# Demo And README Guided Tour Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the live demo and README into one numbered guided tour of the plugin's layout contract while keeping the SVG capture workflow intact and stabilizing mixed icon-text button layout.

**Architecture:** Keep the visible demo composition in `src/demo/showcaseDemo.ts`, but drive its narrative from a tightened shared section contract in `src/demo/showcaseSections.ts`. Rewrite `README.md` to follow that same chapter order and absorb the old API appendix into the prose. Fix the shared button-content layout at the shared renderer/CSS layer so both `boolean-button` and `sized-button` inherit the same stable icon/text behavior.

**Tech Stack:** TypeScript, Vitest, Vite, Tweakpane v4, Markdown, SVG export helpers

---

## File Map

**Modify**

- `src/demo/showcaseSections.ts`
  - Replace the old README/showcase section taxonomy with the new guided-tour chapter contract.
- `src/demo/showcaseSections.test.ts`
  - Lock the shared chapter order and screenshot inventory.
- `src/demo/showcaseDemo.ts`
  - Replace the visible `Basics...` / `Button Extensions` flow with the five numbered guided-tour sections.
- `src/demo/showcaseDemo.test.ts`
  - Lock visible demo titles, section order, and the removal of `Button Extensions`.
- `src/demo/readmeShowcase.test.ts`
  - Lock README heading order and image references.
- `README.md`
  - Rewrite the documentation body around the new guided-tour structure.
- `src/core/button/buttonContent.ts`
  - Adjust shared button-content markup for stable icon/text positioning.
- `src/core/button/buttonContent.test.ts`
  - Add tests for icon-only, text-only, and icon-plus-text output shape.
- `src/core/SizedButtonPlugin.ts`
  - Move off the drifting inline cluster layout and consume the new shared button-content styling.
- `src/core/BooleanButtonPlugin.ts`
  - Consume the same shared button-content styling so boolean buttons do not depend on sized-button CSS side effects.
- `docs/images/*.svg`
  - Re-export the approved screenshot inventory after the demo rewrite.

**Create**

- `src/core/button/buttonStyles.ts`
  - Shared CSS snippets for the button content rails and inner content alignment used by both button plugins.

**Verify Only**

- `demo/main.ts`
  - Capture mode and export POST path should remain compatible.
- `demo/vite.config.ts`
  - Capture-mode write endpoint should remain compatible.
- `src/demo/exportPaneSvg.ts`
  - No intended functional change, but the regenerated SVGs depend on this path.

---

### Task 1: Lock The Guided-Tour Contract In Tests And Shared Metadata

**Files:**
- Modify: `src/demo/showcaseSections.ts`
- Modify: `src/demo/showcaseSections.test.ts`
- Modify: `src/demo/showcaseDemo.test.ts`
- Modify: `src/demo/readmeShowcase.test.ts`

- [ ] **Step 1: Rewrite the shared section-contract test to expect the new chapter order**

Use expectations in `src/demo/showcaseSections.test.ts` like:

```ts
expect(README_SECTION_KEYS).toEqual([
  'overview',
  'install',
  'quick-start',
  'first-split',
  'width-geometry',
  'units-and-height-flow',
  'control-semantics',
  'composing-layouts',
  'run-the-demo',
]);
```

Keep the screenshot inventory expectation unless a screenshot file name must actually change.

- [ ] **Step 2: Rewrite the README contract test to expect the new chapter headings**

Use assertions in `src/demo/readmeShowcase.test.ts` like:

```ts
expect(readme).toMatch(/^## 1 First Split$/m);
expect(readme).toMatch(/^## 2 Width Geometry$/m);
expect(readme).toMatch(/^## 3 Units And Height Flow$/m);
expect(readme).toMatch(/^## 4 Control Semantics$/m);
expect(readme).toMatch(/^## 5 Composing Layouts$/m);
expect(readme).not.toMatch(/^## API Quick Reference$/m);
```

- [ ] **Step 3: Rewrite the demo contract test to expect the new visible section titles**

Update `src/demo/showcaseDemo.test.ts` to expect:

```ts
expect(titles).toEqual([
  '1 First Split',
  '2 Width Geometry',
  '3 Units And Height Flow',
  '4 Control Semantics',
  '5 Composing Layouts',
]);
```

Also assert that `Button Extensions` is absent.

- [ ] **Step 4: Run the focused contract tests to verify they fail**

Run: `npm.cmd exec vitest run src/demo/showcaseSections.test.ts src/demo/showcaseDemo.test.ts src/demo/readmeShowcase.test.ts`

Expected: FAIL because the current metadata, demo titles, and README headings still reflect the old structure.

- [ ] **Step 5: Rebuild `src/demo/showcaseSections.ts` around the new narrative**

Keep this file narrow:

- top-level README section order
- guided-tour section titles
- screenshot inventory / dual-state pairs

Do not make it responsible for demo-specific component mounting.

- [ ] **Step 6: Re-run the focused contract tests**

Run: `npm.cmd exec vitest run src/demo/showcaseSections.test.ts src/demo/showcaseDemo.test.ts src/demo/readmeShowcase.test.ts`

Expected: still FAIL on demo/README content, but the shared contract module should compile and its own test should pass.

- [ ] **Step 7: Commit the metadata/test baseline**

```bash
git add src/demo/showcaseSections.ts src/demo/showcaseSections.test.ts src/demo/showcaseDemo.test.ts src/demo/readmeShowcase.test.ts
git commit -m "test: lock guided tour contract"
```

### Task 2: Rewrite The Visible Demo As A Five-Chapter Guided Tour

**Files:**
- Modify: `src/demo/showcaseDemo.ts`
- Modify: `src/demo/showcaseDemo.test.ts`
- Verify: `demo/main.ts`

- [ ] **Step 1: Add failing assertions for the new subtitles and section removal**

Extend `src/demo/showcaseDemo.test.ts` with checks such as:

```ts
expect(root.textContent).toContain('One split root creates slots.');
expect(root.textContent).toContain('All row widths follow one geometry model');
expect(root.textContent).not.toContain('Button Extensions');
```

Keep the capture-button assertions and export target list intact.

- [ ] **Step 2: Run the focused demo test to verify it fails**

Run: `npm.cmd exec vitest run src/demo/showcaseDemo.test.ts`

Expected: FAIL because the visible demo still renders the old section names and subtitles.

- [ ] **Step 3: Replace the visible section headings and subtitles in `src/demo/showcaseDemo.ts`**

Update the visible chapter titles to:

```ts
'1 First Split'
'2 Width Geometry'
'3 Units And Height Flow'
'4 Control Semantics'
'5 Composing Layouts'
```

Make each subtitle a rule sentence, not a component label sentence.

- [ ] **Step 4: Reshape the section content so each visible chapter teaches one idea**

Implementation constraints:

- `1 First Split`: keep one split, one wrapped pane, one plain DOM host
- `2 Width Geometry`: keep width-expression examples only
- `3 Units And Height Flow`: show adaptive vertical growth and a DOM/SVG host in the same row
- `4 Control Semantics`: absorb the old boolean button, sized button, and compact slider examples here
- `5 Composing Layouts`: keep the integrated composition example as the final proof section

Remove the visible `Button Extensions` section entirely.

- [ ] **Step 5: Keep capture mode compatible while changing only the visible tour**

Ensure:

- `?capture=1` still shows the export button
- hidden capture-only panes still mount
- `mounted.exportTargets.keys()` stays the approved nine-key list unless a key truly must change

- [ ] **Step 6: Re-run the focused demo test**

Run: `npm.cmd exec vitest run src/demo/showcaseDemo.test.ts`

Expected: PASS

- [ ] **Step 7: Commit the demo rewrite**

```bash
git add src/demo/showcaseDemo.ts src/demo/showcaseDemo.test.ts
git commit -m "feat: turn demo into guided tour"
```

### Task 3: Rewrite README.md Around The Same Guided-Tour Chapters

**Files:**
- Modify: `README.md`
- Modify: `src/demo/readmeShowcase.test.ts`
- Verify: `src/demo/showcaseSections.ts`

- [ ] **Step 1: Expand the README contract test with the new heading and content expectations**

Add assertions that the README:

- keeps `Overview`, `Install`, and `Quick Start`
- contains the new `## 1 ... ## 5 ...` chapters
- removes `## Button Views`
- removes `## Compact Sliders` as a standalone top-level chapter
- removes `## API Quick Reference`

Example expectations:

```ts
expect(readme).not.toMatch(/^## Button Views$/m);
expect(readme).not.toMatch(/^## Compact Sliders$/m);
expect(readme).toContain('row nodes resolve to the tallest visible child');
expect(readme).toContain('unknown content only falls back to safe measurement');
```

- [ ] **Step 2: Run the focused README contract test to verify it fails**

Run: `npm.cmd exec vitest run src/demo/readmeShowcase.test.ts`

Expected: FAIL because the README still follows the old structure.

- [ ] **Step 3: Rewrite the README body using the five guided-tour chapters**

Keep:

- `Overview`
- `Install`
- `Quick Start`
- `Run the Demo`

Replace the middle body with:

- `## 1 First Split`
- `## 2 Width Geometry`
- `## 3 Units And Height Flow`
- `## 4 Control Semantics`
- `## 5 Composing Layouts`

Each chapter should include:

- screenshot
- one or two paragraphs of natural language
- `View code`

Absorb the old API bullet points directly into the prose where they belong.

- [ ] **Step 4: Make the prose explicitly state the real contracts**

Required content to include in natural language:

- single-geometry horizontal sizing
- `units` as the only vertical baseline field
- `row = max`, `column = sum`
- declared units before measured fallback
- safe upward quantization for unknown DOM
- `boolean-button` vs `sized-button`
- `content` / `contentOn` inheritance
- `compactSliders` as layout-only treatment
- `wrapPane()` label/inset normalization

- [ ] **Step 5: Re-run the focused README contract test**

Run: `npm.cmd exec vitest run src/demo/readmeShowcase.test.ts`

Expected: PASS

- [ ] **Step 6: Commit the README rewrite**

```bash
git add README.md src/demo/readmeShowcase.test.ts
git commit -m "docs: rewrite readme as guided tour"
```

### Task 4: Stabilize Shared Button Content Layout

**Files:**
- Create: `src/core/button/buttonStyles.ts`
- Modify: `src/core/button/buttonContent.ts`
- Modify: `src/core/button/buttonContent.test.ts`
- Modify: `src/core/SizedButtonPlugin.ts`
- Modify: `src/core/BooleanButtonPlugin.ts`

- [ ] **Step 1: Add a failing shared button-content test for the three content modes**

In `src/core/button/buttonContent.test.ts`, add cases like:

```ts
it('renders a stable mixed icon-text structure', () => {
  const el = renderButtonContent(document, {
    text: 'Compact Sliders',
    icon: {path: 'M3 8h10'},
  });

  expect(el.querySelector('.tp-btnc_rail')).not.toBeNull();
  expect(el.querySelector('.tp-btnc_t')).not.toBeNull();
});
```

Also add one text-only case and one icon-only case.

- [ ] **Step 2: Run the focused button-content test to verify it fails**

Run: `npm.cmd exec vitest run src/core/button/buttonContent.test.ts`

Expected: FAIL because the current renderer still emits a single drifting inline cluster.

- [ ] **Step 3: Introduce shared button-content CSS ownership**

Create `src/core/button/buttonStyles.ts` to export shared CSS snippets for:

- `.tp-btnv_c`
- stable icon rail / text rail layout
- icon sizing
- text multiline behavior

This removes the hidden coupling where boolean buttons rely on layout CSS living inside the sized-button plugin.

- [ ] **Step 4: Update the shared renderer and both plugins to use the stabilized structure**

Implementation direction:

- `renderButtonContent()` should emit stable wrappers for icon/text combinations
- icon-only and text-only should still collapse cleanly
- `SizedButtonPlugin.ts` and `BooleanButtonPlugin.ts` should both include the shared button-content CSS snippet

Do not change the public `content` API.

- [ ] **Step 5: Re-run the focused button-content and plugin tests**

Run: `npm.cmd exec vitest run src/core/button/buttonContent.test.ts src/core/SizedButtonPlugin.test.ts src/core/BooleanButtonPlugin.test.ts`

Expected: PASS

- [ ] **Step 6: Commit the button layout fix**

```bash
git add src/core/button/buttonStyles.ts src/core/button/buttonContent.ts src/core/button/buttonContent.test.ts src/core/SizedButtonPlugin.ts src/core/BooleanButtonPlugin.ts
git commit -m "fix: stabilize shared button content layout"
```

### Task 5: Refresh The Screenshot Inventory From The New Guided Tour

**Files:**
- Verify/Overwrite: `docs/images/split-first-row.svg`
- Verify/Overwrite: `docs/images/split-size-expressions.svg`
- Verify/Overwrite: `docs/images/split-mixed-dom.svg`
- Verify/Overwrite: `docs/images/button-boolean-off.svg`
- Verify/Overwrite: `docs/images/button-boolean-on.svg`
- Verify/Overwrite: `docs/images/button-sized-actions.svg`
- Verify/Overwrite: `docs/images/compact-sliders-off.svg`
- Verify/Overwrite: `docs/images/compact-sliders-on.svg`
- Verify/Overwrite: `docs/images/composing-layouts.svg`

- [ ] **Step 1: Run the focused demo and README tests before regenerating images**

Run: `npm.cmd exec vitest run src/demo/showcaseDemo.test.ts src/demo/readmeShowcase.test.ts`

Expected: PASS

- [ ] **Step 2: Start the demo server**

Run: `npm.cmd run demo`

Open: `http://127.0.0.1:5173/?capture=1`

- [ ] **Step 3: Click `Export README SVGs` to overwrite the approved SVG files**

Expected page status: `Wrote 9 SVGs`

Do not keep visible duplicate off/on example panes in the live page; capture-only duplicates remain hidden.

- [ ] **Step 4: Manually inspect the key screenshots**

Review at least:

- `docs/images/split-size-expressions.svg`
- `docs/images/split-mixed-dom.svg`
- `docs/images/button-boolean-on.svg`
- `docs/images/compact-sliders-on.svg`
- `docs/images/composing-layouts.svg`

Confirm:

- the guided-tour visuals match the new chapter semantics
- no title-bar-only truncation
- button icon position looks stable across content-length changes

- [ ] **Step 5: Re-run the README contract test after export**

Run: `npm.cmd exec vitest run src/demo/readmeShowcase.test.ts`

Expected: PASS

- [ ] **Step 6: Commit the refreshed screenshots**

```bash
git add docs/images
git commit -m "docs: refresh guided tour screenshots"
```

### Task 6: Final Verification And Cleanup

**Files:**
- Verify: `README.md`
- Verify: `src/demo/showcaseSections.ts`
- Verify: `src/demo/showcaseDemo.ts`
- Verify: `src/core/button/buttonContent.ts`
- Verify: `src/core/button/buttonStyles.ts`
- Verify: `src/core/SizedButtonPlugin.ts`
- Verify: `src/core/BooleanButtonPlugin.ts`
- Verify: `docs/images/*.svg`

- [ ] **Step 1: Run the full test suite**

Run: `npm.cmd exec vitest run`

Expected: PASS

- [ ] **Step 2: Run the library build**

Run: `npm.cmd run build`

Expected: PASS

- [ ] **Step 3: Run the demo production build**

Run: `npm.cmd exec -- vite build --config demo/vite.config.ts`

Expected: PASS

- [ ] **Step 4: Do a final live smoke check**

Check:

- the visible demo shows the five numbered chapters
- `Button Extensions` is gone
- `?capture=1` still reveals the export button
- `Export README SVGs` still overwrites the approved SVG inventory

- [ ] **Step 5: Inspect the final worktree**

Run: `git status --short`

Expected: only intended tracked changes remain

- [ ] **Step 6: Commit the final cleanup pass**

```bash
git add README.md src demo docs/images
git commit -m "feat: align demo and readme guided tour"
```
