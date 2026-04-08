# Demo Section Order And Fixed Gauge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorder the demo/README chapters so `Custom DOM` comes before `Units And Height Flow`, and restore the fixed-`4u` donut gauge visual in the height-flow chapter.

**Architecture:** Keep the current showcase pipeline intact. Change the shared section ordering contract first, then add a failing demo test for the fixed gauge host, then minimally restore the gauge DOM inside the existing `Units And Height Flow` renderer and sync README prose.

**Tech Stack:** TypeScript, Vite, Vitest, Tweakpane, existing demo SVG export helpers

---

### Task 1: Lock the new section order in shared metadata

**Files:**
- Modify: `src/demo/showcaseSections.ts`
- Test: `src/demo/showcaseSections.test.ts`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run the test and confirm the old order fails**
- [ ] **Step 3: Update shared section metadata to place `custom-dom` before `units-and-height-flow`**
- [ ] **Step 4: Re-run the test and confirm it passes**

### Task 2: Restore the fixed-gauge visual in Units And Height Flow

**Files:**
- Modify: `src/demo/showcaseDemo.ts`
- Test: `src/demo/showcaseDemo.test.ts`

- [ ] **Step 1: Write a failing test that expects a fixed `4u` gauge host in the height-flow section**
- [ ] **Step 2: Run the focused demo test and confirm it fails**
- [ ] **Step 3: Reintroduce the donut gauge inside a declared-span DOM host without changing the host’s fixed unit contract**
- [ ] **Step 4: Re-run the focused demo test and confirm it passes**

### Task 3: Sync README chapter order and prose

**Files:**
- Modify: `README.md`
- Test: `src/demo/showcaseSections.test.ts`
- Test: `src/demo/showcaseDemo.test.ts`

- [ ] **Step 1: Update README headings and text so `Custom DOM` becomes section 3 and `Units And Height Flow` becomes section 4**
- [ ] **Step 2: Ensure the height-flow text explicitly describes the right side as a fixed `4u` visual host**
- [ ] **Step 3: Run focused tests for demo metadata and demo rendering**
- [ ] **Step 4: Run the full test suite and production build**
