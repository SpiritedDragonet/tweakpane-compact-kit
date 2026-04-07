# Demo And README Guided Tour Design

## Summary

The demo and README should stop behaving like a loose showcase of plugin parts
and instead become one guided tour of the layout contract.

The new structure uses a shared numbered narrative:

1. `First Split`
2. `Width Geometry`
3. `Units And Height Flow`
4. `Control Semantics`
5. `Composing Layouts`

The live demo stays compact and interactive. The README stays richer and more
explicit. Both should teach the same mental model in the same order.

## Goals

- Explain the split-layout contract in natural language, not only through code.
- Make the horizontal sizing model legible to developers.
- Make the vertical `units` model legible to developers.
- Explain how custom DOM hosts and unknown controls participate in the same
  system.
- Explain button and slider semantics as part of the layout contract instead of
  leaving them in a separate grab-bag section.
- Keep `Composing Layouts` as the final integrated example.
- Keep the demo and README aligned enough that moving between them feels
  natural.

## Non-Goals

- No installation or onboarding content inside the live demo.
- No separate `API Quick Reference` chapter in the README.
- No second layout system just for documentation examples.
- No feature redesign beyond a small button-content stabilization patch.

## Narrative Structure

### Shared Section Order

Both the demo and the README should use the same five visible teaching
chapters:

1. `First Split`
2. `Width Geometry`
3. `Units And Height Flow`
4. `Control Semantics`
5. `Composing Layouts`

The numeric prefix is part of the teaching flow, not a page-count indicator.
Use plain `1`, `2`, `3`, and so on, not `1/5`.

### Why The Numbering Exists

The numbers communicate that the sections are meant to be read in order. They
should feel like a short guided path through the plugin's semantics rather than
five unrelated cards.

## Demo Contract

### General Rules

- The live demo remains a compact interactive page.
- Section subtitles should read like rule sentences, not component labels.
- Each visible section should teach one main concept.
- The old `Button Extensions` section should be removed.
- `Composing Layouts` remains the last visible section.

### 1 First Split

Purpose:

- Teach the smallest useful split mental model.

The section should show:

- one split root
- one wrapped child pane
- one plain DOM host

The subtitle should communicate:

- a split creates slots
- a slot can host a wrapped child pane or plain DOM
- `wrapPane()` is the standard way to reconnect a child pane to split
  semantics

### 2 Width Geometry

Purpose:

- Teach the horizontal sizing contract only.

The section should show:

- equal tracks
- `fr` tracks
- percentage tracks
- mixed expressions

The subtitle should communicate:

- all horizontal expressions share one geometry model
- widths that should align do align naturally

### 3 Units And Height Flow

Purpose:

- Teach vertical sizing as a first-class contract instead of a side effect.

The section should make the following visible:

- `units` is the only vertical baseline field
- a row resolves to the tallest visible child
- a column resolves to the sum of visible children
- adaptive content can grow and shrink
- a fixed-span DOM host still participates in the same system

Recommended shape:

- keep the existing mixed DOM idea, but make the left side include at least one
  adaptive child whose live units can change, such as a folder
- keep a DOM/SVG host on the right so the section also demonstrates the custom
  host contract

### 4 Control Semantics

Purpose:

- Replace the old `Button Extensions` bucket with a rule-driven section.

This section should cover:

- `boolean-button` as a real boolean binding
- `sized-button` as a stateless action blade
- pure-text, pure-icon, and mixed icon-text button content
- `content` and `contentOn` inheritance
- `compactSliders` as a layout treatment rather than a logic change
- how wrapped split leaves handle native labels and inset assumptions

The subtitle should communicate:

- buttons change control semantics and presentation
- compact sliders only change arrangement

### 5 Composing Layouts

Purpose:

- Prove that the earlier rules still hold when everything is combined.

This section should stay as the final integrated example and should not be
reduced to another small feature card.

It should visibly combine:

- semantic slots
- nested rows and columns
- adaptive folder growth
- mixed custom DOM
- multi-unit controls
- compact slider treatment

## README Contract

### Top-Level Structure

The README should keep:

- `Overview`
- `Install`
- `Quick Start`

Then it should switch into the same five teaching chapters used by the demo:

1. `First Split`
2. `Width Geometry`
3. `Units And Height Flow`
4. `Control Semantics`
5. `Composing Layouts`

`Run the Demo` can remain as a short closing section after the guided tour.

### Per-Section Format

Each guided-tour section should use the same shape:

- heading
- screenshot
- one or two paragraphs of natural-language explanation
- collapsible code example

The language should explain the contract directly, not only describe the
example on screen.

### No Separate API Appendix

The old `API Quick Reference` material should be absorbed into the teaching
chapters. The goal is for developers to learn each API surface in the same
place where its semantics are explained.

## Required Documentation Content

### 1 First Split

The README text must clearly explain:

- `split-layout` is structural, not a special leaf widget
- `children` define slots
- string children are semantic leaves
- slots can host a wrapped child pane, nested split, or plain DOM
- `wrapPane()` is the preferred child-pane path inside split slots

### 2 Width Geometry

The README text must clearly explain:

- there is one horizontal geometry model
- `px` and `%` pre-cut width
- `fr` and bare numbers divide the remainder
- gutter alignment comes from the same rule for every token
- mixed expressions such as `200px 1fr 30%` are expected and supported

The explanation should closely reflect the actual single-geometry model already
implemented in `singleGeometry.ts`.

### 3 Units And Height Flow

The README text must clearly explain:

- `units` is the only supported vertical baseline field
- `rowUnits` and `height` are retired
- fixed controls publish units directly
- adaptive nodes resolve to `max(baseUnits, liveUnits)`
- row nodes resolve to the tallest visible child
- column nodes resolve to the sum of visible children
- shrink-back returns to the node baseline instead of an arbitrary measured
  height

It must also explain the custom-host path:

- known compact-kit controls publish their own units
- custom DOM that knows its intended span should declare it
- unknown content only falls back to safe measurement when no stronger contract
  is available
- measured fallback rounds upward to avoid clipping

### 4 Control Semantics

The README text must clearly explain:

- `boolean-button` preserves boolean binding semantics
- `sized-button` preserves action semantics
- `content` is the normalized long form
- `title` and top-level `icon` are shorthand
- `contentOn` only overrides the fields it provides
- icon-only, text-only, and icon-plus-text content are all supported
- `compactSliders` changes layout treatment only
- wrapped panes normalize native label padding and nested split inset behavior

This chapter may use short internal subheadings if needed, for example:

- `Boolean Buttons`
- `Sized Actions`
- `Compact Sliders`
- `Labels Inside Split Leaves`

### 5 Composing Layouts

The README text must clearly explain:

- this is not a separate layout mode
- this is the integrated proof that the earlier four rules still hold together

It should point back to the earlier sections rather than re-explaining all
details from scratch.

## Button Content Stabilization Patch

The current mixed icon-and-text button layout centers the combined inline
cluster. That means the icon can drift horizontally when text length changes.

This pass should include a small layout fix:

- mixed icon-text content should use a stable icon rail and text rail instead
  of one drifting inline cluster
- the text should remain visually centered
- the icon should keep a stable relative position
- icon-only and text-only cases should still collapse naturally without extra
  placeholder markup leaking into the API

This patch applies to both `boolean-button` and `sized-button` because they
share the same content renderer.

## Screenshot And Capture Notes

- The visible demo narrative changes, but the dev-only SVG export workflow
  should remain intact.
- Existing screenshot file names may stay stable when the concept they depict
  is still the same.
- If a screenshot stops matching the new chapter naming or semantics, update the
  README reference and export target together.

## Acceptance Criteria

This design is complete when:

- the live demo uses the five numbered chapters above
- the live demo no longer contains a visible `Button Extensions` section
- the README uses the same five chapter titles in the same order
- the README no longer contains a separate `API Quick Reference` section
- each chapter contains natural-language explanation of its contract
- horizontal geometry rules are explained explicitly
- vertical unit and height-flow rules are explained explicitly
- DOM host and unknown-control fallback rules are explained explicitly
- button content and compact slider semantics are explained explicitly
- `Composing Layouts` remains the final integrated example
- mixed icon-text buttons keep a stable icon position when text length changes
