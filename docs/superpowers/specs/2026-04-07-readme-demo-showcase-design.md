# README and Demo Showcase Redesign

## Summary

This design reshapes the project's public presentation around one shared showcase
track instead of two loosely related ones.

The desired outcome is:

- the README reads like a compact showcase manual
- the demo uses the same section structure as the README
- screenshots are exported from those demo sections instead of being designed as
  a separate landing-page asset set
- onboarding stays explicit through install instructions and a real quick-start
  path

The project should present itself as an extension kit for Tweakpane rather than
as a single-feature plugin.

## Goals

- Present the package first as an extension kit built around split layout,
  button views, and compact slider treatment.
- Keep the README and the demo on one shared content structure so they do not
  drift apart.
- Make screenshots serve the README body sections directly instead of serving a
  separate marketing layer.
- Keep each README section easy to scan: screenshot first, short explanation,
  code hidden behind a collapsible block.
- Move install and calling guidance into a first-class onboarding layer instead
  of scattering them across examples.
- Ensure all screenshot assets live in `docs/images/` with stable, semantic file
  names that can be committed and rendered correctly on GitHub.

## Non-Goals

- No separate hero gallery or second "landing" story above the actual manual.
- No screenshot set that cannot be reproduced from the demo page.
- No highly decorated documentation illustrations; screenshots should remain
  pure pane/control captures.
- No duplication where the same capability is explained once in an overview and
  again in the main body.
- No redesign of the plugin behavior itself as part of this documentation pass.

## Approved Direction

### Positioning

The package is presented as an extension kit:

- split-layout is the structural foundation
- boolean-button and sized-button are natural UI extensions
- compact sliders are a layout-oriented enhancement of native controls

### Top-Level Presentation

The README keeps a very thin overview rather than a full landing section.

The overview should contain:

- one concise positioning sentence
- install instructions
- quick-start calling path
- anchor links into the main body

The overview should not contain:

- a second set of screenshots
- a second set of capability explanations
- standalone capability cards that repeat the body

## Content Architecture

The README and the demo should share this top-level sequence:

1. `Overview`
2. `Split Layout`
3. `Button Views`
4. `Compact Sliders`
5. `Composing Layouts`
6. `API Quick Reference`
7. `Run the Demo`

### `Overview`

This section exists to get a new user unstuck quickly.

It should include:

- the package positioning sentence
- `npm install` instructions
- the Tweakpane v4 peer dependency note
- a minimal quick-start example
- anchor links to the showcase body

### `Split Layout`

This is the first main body section because it remains the backbone of the kit.

It should contain three subsections:

- `First Split`
- `Size Expressions`
- `Mixed DOM`

These three subsections cover:

- mounting nested panes and DOM through slots
- the single row geometry model and supported `sizes` syntax
- the difference between known controls and measured custom DOM hosts

### `Button Views`

This section isolates the custom button primitives from layout concerns.

It should contain two subsections:

- `Boolean Button`
- `Sized Button`

The `Boolean Button` subsection should explicitly describe the control as a real
boolean binding, not a second state system.

### `Compact Sliders`

This should be a dedicated section rather than being nested under button views.

It should explain that the feature is:

- a compact layout treatment of native slider UI
- not a replacement implementation of the slider logic
- compatible with split-layout and boolean-button driven state toggles

### `Composing Layouts`

This section replaces the current "semantic leaves" presentation as the public
showcase label.

It should present the composition layer:

- semantic slot names
- nested split trees
- folders and adaptive height behavior
- custom hosts
- mixed control composition

### `API Quick Reference`

This section is for lookup, not storytelling.

It should keep the public surface grouped by capability instead of keeping a
single long mixed bullet list.

This section should not include screenshots.

## Onboarding Layer

The onboarding layer should appear before the showcase body.

### Install

The install block should be explicit and minimal:

```bash
npm install tweakpane tweakpane-compact-kit
```

It should also state:

- `tweakpane` v4 is the expected peer dependency

### Quick Start

The quick-start example should show the shortest real path from install to a
mounted split:

- import `Pane`
- import `CompactKitBundle`
- create a `Pane`
- call `pane.registerPlugin(CompactKitBundle)`
- add a `split-layout` blade
- obtain slots with `getSlots()`

The quick-start guidance should also make the nested-pane rule explicit:

- child panes mounted inside split slots should also register
  `CompactKitBundle`
- when mounting a child pane into a split slot, `api.wrapPane(pane)` is the
  preferred path so hidden-label rows and nested split roots inherit the correct
  split behavior

## Screenshot Strategy

Screenshots should be treated as static assets exported from the demo, not as
independent documentation artwork.

Rules:

- every README screenshot must correspond to a real demo section and a stable
  demo state
- screenshots live in `docs/images/`
- screenshots are pure pane/control captures
- each subsection gets one primary screenshot by default
- a second screenshot is used only when the state transition itself is part of
  the value proposition

### Screenshot Set

The approved screenshot inventory is:

- `split-first-row.svg`
- `split-size-expressions.svg`
- `split-mixed-dom.svg`
- `button-boolean-off.svg`
- `button-boolean-on.svg`
- `button-sized-actions.svg`
- `compact-sliders-off.svg`
- `compact-sliders-on.svg`
- `composing-layouts.svg`

### Dual-State Screenshots

Only two features should intentionally use paired screenshots:

- boolean button: `off` / `on`
- compact sliders: `off` / `on`

The point of the extra image is not decoration; it is to make the visible state
change legible in GitHub without requiring the live demo.

## Demo-to-README Mapping

The demo page should follow the README body structure rather than being an
independent playground with unrelated ordering.

The mapping rules are:

- the major section order matches the README
- subsection names should match or stay very close
- README screenshots are taken from the default state of the corresponding demo
  section
- the demo may contain extra interaction inside a section, but it must not
  introduce a second narrative track

### Allowed Demo Expansion

The demo may be slightly "fatter" than the README in these ways:

- live toggles
- animated or updating controls
- one or two extra variants within a section
- interaction-friendly defaults

The demo should not become fatter in these ways:

- new top-level sections that the README does not have
- separate examples that exist only for the demo and not for the public manual
- repeated explanation of the same capability in multiple places

## Presentation Rules

Each README subsection should follow one consistent rhythm:

1. subsection title
2. one screenshot
3. two to four short explanatory sentences
4. one collapsible code block
5. optional second screenshot only if the section is state-driven

### Code Blocks

Code examples should default to collapsed `<details>` blocks.

Reasoning:

- screenshots and explanation stay visually primary
- code remains available immediately below without leaving the page
- the page does not become a wall of code on first load

### Text Density

The text should stay concise.

Each subsection should answer only:

- what capability this is
- why it matters
- what design rule or usage pattern the reader should remember

API edge cases and exhaustive option lists belong in the quick reference, not in
the main showcase text.

## Asset and Repository Considerations

The repository already uses `docs/images/` as the screenshot location, so the
redesign should continue to use that directory rather than inventing another
asset path.

The design assumes:

- the generated SVG screenshots are committed into the repository
- README image paths point at committed files under `docs/images/`
- GitHub rendering should succeed without post-processing or remote asset hosts

## Implementation Notes

When implementation begins, it should likely proceed in this order:

1. reorganize the demo sections to match the new shared structure
2. set stable default states for screenshot export
3. export the final screenshot set into `docs/images/`
4. rewrite the README around the approved section sequence
5. verify all image paths render correctly in local markdown preview and on the
   committed branch

## Acceptance Criteria

This design is complete when:

- the README opens with install instructions and a genuine quick-start path
- the README body is organized as `Split Layout`, `Button Views`,
  `Compact Sliders`, and `Composing Layouts`
- the demo uses the same major section order
- screenshots come from the demo sections rather than from a separate marketing
  layer
- the approved screenshot inventory exists in `docs/images/`
- boolean button and compact slider state changes each have two committed
  screenshots
- code blocks in the README default to collapsed details blocks
- the README and demo can be maintained as one shared showcase track instead of
  two diverging stories
