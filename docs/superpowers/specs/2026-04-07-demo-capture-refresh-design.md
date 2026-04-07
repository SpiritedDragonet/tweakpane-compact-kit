# Demo Capture Refresh Design

## Summary

The live demo should go back to being a compact, interactive explanation of the
plugin's real layout semantics. README onboarding and screenshot-only duplicate
states should not live in the visible demo body.

This pass keeps the new README screenshot inventory, but changes how those
screenshots are produced:

- the page shows one interactive example per concept
- screenshot export is an explicit dev-only action
- dual-state screenshots are generated during export, not displayed as duplicate
  visible examples
- exported SVG files are written directly into `docs/images/`

## Goals

- Restore the live demo's role as the primary interactive explanation of split
  layout, button views, compact sliders, and composition behavior.
- Keep the README screenshot pipeline reproducible from the demo page without
  polluting the visible demo with capture-only duplicate instances.
- Make screenshot regeneration a one-click dev workflow instead of a manual
  download-and-move routine.
- Reintroduce the more informative integrated composition example so the demo
  actually teaches row semantics, column semantics, multi-unit controls, folder
  growth, and mixed composition.

## Non-Goals

- No install/quick-start/README onboarding content inside the live demo page.
- No browser download workflow for the committed screenshots.
- No separate PNG preview pipeline in the product workflow.
- No second visual redesign of the README in this pass.

## Approved Direction

### Demo vs README Boundary

README keeps:

- install and quick start
- the narrative/manual structure
- dual-state screenshots for boolean button and compact sliders

The live demo keeps:

- a lightweight `main`-style shell
- one visible interactive instance per concept
- concise labels/subtitles only where they help orient the viewer

### Visible Demo Structure

The visible demo should return to a structure close to the current `main`
version:

1. `Basics 1/3 — First Split`
2. `Basics 2/3 — Size Expressions`
3. `Basics 3/3 — Mixed DOM`
4. `Button Extensions`
5. `Composing Layouts`

`Composing Layouts` should once again be the integrated, high-signal example.
It should show:

- semantic slot names
- nested row/column usage
- multi-unit buttons
- boolean button usage
- compact-slider treatment
- folder-driven height changes
- column/row height interplay

It should not collapse into another donut-gauge-only variation of `Mixed DOM`.

## Screenshot Export Model

### Trigger

When the demo URL includes `?capture=1`, the page shows a small dev-only button:

- label: something like `Export README SVGs`
- optional nearby status text

Without that query parameter, the button is absent.

### Export Behavior

Clicking the button should:

1. collect the approved screenshot targets
2. generate SVG text for each target
3. send them to a local Vite dev-server endpoint
4. have that endpoint overwrite the matching files under `docs/images/`
5. surface success/failure status in the page

This is the intended workflow:

- open demo with capture mode
- click once
- review the written SVGs

### Dual-State Screenshots

Boolean button and compact slider screenshots still need `off` and `on` files.

Those states should be produced by export logic, not by keeping duplicate panes
visible in the page.

Allowed approaches:

- temporarily mutate the live example state, capture, then restore
- mount an offscreen capture-only instance during export

The visible page should still show only one normal example.

## Dev Server Write Path

The browser should not be responsible for writing repository files directly.
Instead, the Vite dev server should expose a tiny local-only write endpoint used
only in demo development.

Requirements:

- only enabled in the demo dev server
- accepts SVG payloads for the approved file names
- writes into `docs/images/`
- rejects path traversal or arbitrary write targets

## Technical Notes

- `exportPaneSvg.ts` remains useful, but it should stay focused on producing
  valid standalone SVG documents from live pane DOM.
- The XML-safe serialization fix stays; it is required for inputs and other
  Tweakpane controls inside `foreignObject`.
- The visible demo implementation can remain explicit in `demo/main.ts` if that
  stays clearer than forcing it through a second abstraction layer.

## Acceptance Criteria

This refresh is complete when:

- the visible demo no longer contains install/quick-start content
- the visible demo no longer shows duplicate `off/on` panes for capture only
- `Composing Layouts` again functions as the integrated semantics/composition
  example rather than repeating `Mixed DOM`
- `?capture=1` reveals an export button
- clicking that button overwrites the approved SVG inventory in `docs/images/`
- the exported SVG files stay valid and render correctly
- README image links continue to match the committed screenshot inventory
