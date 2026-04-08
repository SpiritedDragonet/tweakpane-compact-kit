# Button Geometry And Units Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix shared icon-plus-text button geometry, add a button-level `iconSize` API, and turn the `Units And Height Flow` visual host into a Details-driven declared-units demo.

**Architecture:** Keep the button DOM contract shared between `boolean-button` and `sized-button`, but move the mixed-content geometry to a button-height-aware anchored layout so icon position no longer depends on text width. Extend both button plugins with one shared `iconSize` parameter, then update the demo copy and the `Units And Height Flow` example to drive host units from state.

**Tech Stack:** TypeScript, Vitest, Vite, Tweakpane

---

### Task 1: Lock the new button geometry contract in tests

**Files:**
- Modify: `src/core/button/buttonStyles.test.ts`
- Modify: `src/demo/showcaseDemo.test.ts`

- [ ] **Step 1: Rewrite the button-style test so mixed content must use a stable anchored layout, full button height, and explicit multiline text spacing**
- [ ] **Step 2: Add/adjust demo assertions for the new direct button copy and the Details-driven units control**
- [ ] **Step 3: Run focused tests and confirm they fail for the expected old geometry/demo behavior**

### Task 2: Implement shared button geometry and `iconSize`

**Files:**
- Modify: `src/core/button/buttonStyles.ts`
- Modify: `src/core/button/buttonContent.ts`
- Modify: `src/core/button/buttonShell.ts`
- Modify: `src/core/SizedButtonPlugin.ts`
- Modify: `src/core/BooleanButtonPlugin.ts`
- Modify: `src/core/button/buttonContent.test.ts`
- Modify: `src/core/SizedButtonPlugin.test.ts`
- Modify: `src/core/BooleanButtonPlugin.test.ts`

- [ ] **Step 1: Add a button-level `iconSize` parameter path shared by both plugins**
- [ ] **Step 2: Update the shared button shell to publish the icon-size CSS variable**
- [ ] **Step 3: Replace the mixed-content layout CSS with a stable anchored layout that keeps icon position independent from text width and centers vertically against the full button height**
- [ ] **Step 4: Re-run focused button/plugin tests until green**

### Task 3: Update demo wording and the units-flow visual host

**Files:**
- Modify: `src/demo/showcaseDemo.ts`
- Modify: `README.md`
- Modify: `src/demo/readmeShowcase.test.ts`

- [ ] **Step 1: Replace the `Run Action` demo copy with a direct English label that explicitly demonstrates a standard 3u multiline button with resizable icon**
- [ ] **Step 2: Tighten the mixed-button demo label so it fits cleanly without clipping**
- [ ] **Step 3: Add a `Units` slider inside `Details` and let it drive the declared units of the right-side host**
- [ ] **Step 4: Sync README/test expectations only where they reflect the demo contract**

### Task 4: Verify end to end

**Files:**
- Verify only

- [ ] **Step 1: Run focused tests for button styles/plugins and showcase demo**
- [ ] **Step 2: Run the full Vitest suite**
- [ ] **Step 3: Run the production build**
