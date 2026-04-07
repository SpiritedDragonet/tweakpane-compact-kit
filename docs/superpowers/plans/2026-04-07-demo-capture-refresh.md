# Demo Capture Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the demo to a compact interactive teaching surface while adding a dev-only one-click SVG export path that writes the README screenshots into `docs/images/`.

**Architecture:** Reuse the current XML-safe SVG export helper, but move the visible demo back toward the explicit `main`-style layout instead of the README-like showcase shell. Add a tiny dev-only capture UI plus a Vite middleware endpoint so screenshot export can temporarily capture the required states and then write the approved SVG files directly into the repo.

**Tech Stack:** TypeScript, Vite dev server middleware, Vitest, Tweakpane v4, browser DOM/SVG serialization

---

## File Map

**Modify**

- `demo/index.html`
  - Revert to a lightweight demo shell without README onboarding content.
- `demo/main.ts`
  - Restore explicit live demo composition, add dev-only capture button/state, and wire export requests.
- `demo/vite.config.ts`
  - Add a local-only write endpoint for committed screenshot export.
- `src/demo/exportPaneSvg.ts`
  - Keep XML-safe SVG export and add any small helpers needed by the new write flow.
- `src/demo/showcaseSections.ts`
  - Keep only the screenshot inventory/contract needed by README and export.
- `src/demo/showcaseDemo.test.ts`
  - Replace the current README-like section assertions with tests that match the new visible demo contract.
- `src/demo/readmeShowcase.test.ts`
  - Keep README screenshot contract intact.

**Delete or Stop Using**

- `src/demo/showcaseDemo.ts`
  - Remove if the explicit `demo/main.ts` flow is clearer than keeping a second composition layer.

---

### Task 1: Re-specify the visible demo contract with tests

**Files:**

- Modify: `src/demo/showcaseDemo.test.ts`
- Modify: `src/demo/showcaseSections.ts`

- [ ] **Step 1: Write failing tests for the refreshed live demo contract**

Cover:

- capture button hidden by default
- capture button shown when `?capture=1`
- visible demo does not render duplicate boolean/compact `off/on` panes
- visible top-level sections align with the compact demo narrative instead of the README onboarding shell

- [ ] **Step 2: Run the focused test file and verify it fails**

Run: `npm.cmd exec vitest run src/demo/showcaseDemo.test.ts`

Expected: FAIL because the current demo still renders the README-like shell and duplicate capture states.

- [ ] **Step 3: Reduce `showcaseSections.ts` to the inventory/export contract**

Keep:

- approved screenshot file names
- stateful capture pairs

Drop anything that incorrectly forces the visible demo structure to mirror the README shell.

- [ ] **Step 4: Re-run the focused test**

Run: `npm.cmd exec vitest run src/demo/showcaseDemo.test.ts`

Expected: still FAIL until the demo implementation changes, but the contract module should compile cleanly.

### Task 2: Restore the visible demo to the compact interactive layout

**Files:**

- Modify: `demo/index.html`
- Modify: `demo/main.ts`
- Delete or stop using: `src/demo/showcaseDemo.ts`

- [ ] **Step 1: Write or update failing tests for the live demo mount behavior**

Test:

- no README install/quick-start content in the page shell
- one visible boolean example only
- one visible compact-slider example only
- `Composing Layouts` exists as a distinct section

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm.cmd exec vitest run src/demo/showcaseDemo.test.ts`

Expected: FAIL on the current README-style shell and duplicated panes.

- [ ] **Step 3: Rewrite `demo/index.html` as a lightweight demo page**

Restore:

- the simple centered demo shell
- section titles/subtitles only

Remove:

- install block
- quick start block
- anchor-chip overview

- [ ] **Step 4: Rewrite `demo/main.ts` around explicit live examples**

Requirements:

- base examples stay readable and interactive
- no visible duplicate `off/on` panes
- `Composing Layouts` reuses the integrated high-signal composition example instead of a repeated donut gauge card

- [ ] **Step 5: Re-run the focused test**

Run: `npm.cmd exec vitest run src/demo/showcaseDemo.test.ts`

Expected: PASS

### Task 3: Add the dev-only capture button and server-side write path

**Files:**

- Modify: `demo/main.ts`
- Modify: `demo/vite.config.ts`
- Modify: `src/demo/exportPaneSvg.ts`

- [ ] **Step 1: Write failing tests for capture mode behavior**

Test:

- `?capture=1` reveals the export button
- export helper still emits valid XML-safe SVG
- non-capture mode does not expose the button

- [ ] **Step 2: Run the focused capture tests and verify they fail**

Run: `npm.cmd exec vitest run src/demo/exportPaneSvg.test.ts src/demo/showcaseDemo.test.ts`

Expected: FAIL because there is no capture-mode button/write flow yet.

- [ ] **Step 3: Add a small write endpoint to `demo/vite.config.ts`**

Requirements:

- accepts only approved screenshot file names
- writes only to `docs/images/`
- rejects unknown file names

- [ ] **Step 4: Add the dev-only capture button to `demo/main.ts`**

Requirements:

- appears only when `capture=1`
- on click, captures all approved SVGs
- temporarily generates dual-state screenshots without keeping duplicate visible panes
- writes status text back into the page

- [ ] **Step 5: Re-run the focused capture tests**

Run: `npm.cmd exec vitest run src/demo/exportPaneSvg.test.ts src/demo/showcaseDemo.test.ts`

Expected: PASS

### Task 4: Regenerate the screenshot inventory from the refreshed demo

**Files:**

- Verify and overwrite: `docs/images/*.svg`

- [ ] **Step 1: Start the demo in capture mode**

Run: `npm.cmd run demo`

Open: `http://127.0.0.1:5173/?capture=1`

- [ ] **Step 2: Click the export button**

Expected:

- status reports success
- approved SVG inventory is overwritten in `docs/images/`

- [ ] **Step 3: Manually inspect the written SVGs**

Check at least:

- `split-size-expressions.svg`
- `split-mixed-dom.svg`
- `button-boolean-off.svg`
- `button-boolean-on.svg`
- `compact-sliders-off.svg`
- `compact-sliders-on.svg`
- `composing-layouts.svg`

- [ ] **Step 4: Re-run the README contract test**

Run: `npm.cmd exec vitest run src/demo/readmeShowcase.test.ts`

Expected: PASS

### Task 5: Final verification

**Files:**

- Verify: `demo/index.html`
- Verify: `demo/main.ts`
- Verify: `demo/vite.config.ts`
- Verify: `src/demo/*`
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

- [ ] **Step 4: Final manual smoke check**

Check:

- visible demo uses the compact main-style shell
- capture button appears only in `?capture=1`
- export still writes the approved SVG inventory

