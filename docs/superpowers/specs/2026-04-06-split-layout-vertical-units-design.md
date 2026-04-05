# Split Layout Vertical Units Design

## Summary

This design finalizes the remaining split-layout cleanup after the maintainability and single-geometry work.

The first four layout decisions from the recent branch work are already treated as implemented background:

1. one horizontal geometry model
2. natural gutter alignment across supported `sizes` syntaxes
3. root inset alignment with native full-width controls
4. button content and boolean-button foundations

This document only defines the remaining vertical sizing model and the API cleanup around it.

The core outcome is:

- horizontal sizing stays on `sizes`
- vertical sizing unifies on integer `units`
- `height` and `rowUnits` are removed
- structural layout uses `row` / `column`
- adaptive height becomes a first-class rule instead of an accidental side effect

## Goals

- Keep the already-implemented horizontal split geometry unchanged.
- Define one vertical sizing language centered on integer `units`.
- Remove the semantic overlap between `units`, `rowUnits`, and `height`.
- Make nested `row` / `column` height propagation predictable and testable.
- Treat known controls, unknown third-party controls, and custom DOM hosts under one model.
- Preserve optional interactive gutters, but keep them off by default.
- Keep the third-party opt-in path lightweight rather than mandatory.

## Non-Goals

- No second vertical layout model beside `units`.
- No backward-compatibility shim for `height` or `rowUnits`.
- No automatic rescue when user-authored layouts overflow their available space.
- No persistence of interactive gutter changes across app restarts.
- No redefinition of the already-approved horizontal `sizes` geometry.
- No promise of horizontal reflow animation.

## Public Surface

### Keep

- `view: 'split-layout'`
- `direction: 'row' | 'column'`
- `sizes`
- `units`
- `gutter`
- `interactive`
- `compactSliders`
- semantic string children as slot/category shorthand
- `getSlots()`
- `getSlotsByCategory()`

### Remove

- `height`
- `rowUnits`

These legacy fields are retired directly. The runtime should reject them with a clear error instead of silently translating them.

## Public Model

### Structural Nodes

Public layout structure is described in terms of `row` and `column`.

- `row` places children horizontally.
- `column` places children vertically.
- children may be containers, known controls, unknown third-party controls, or custom control hosts.
- alternation is not required; a `row` may contain another `row`, and a `column` may contain another `column`.

String children may remain as a shorthand for named slots, but they are not the semantic center of the model anymore. Public documentation should stop teaching `leaf` as the main concept.

### `units`

`units` is the only public vertical sizing field.

- it is always an integer
- it means `baseUnits`
- it is the baseline height for a node
- it is not automatically a hard upper bound

If a node is adaptive, `liveUnits` may exceed `units`.

## Node Semantics

Split layout should reason about each node through two separate questions:

1. what is its structural role: `row` or `column`
2. what is its height behavior: `fixed` or `adaptive`

This separation avoids treating all atomic controls as if they shared the same height behavior.

### `fixed`

`fixed` nodes have a stable vertical demand.

- their `liveUnits` is their declared or known `units`
- they do not automatically grow in response to internal content changes

Examples:

- `sized-button`
- `boolean-button`
- simple known single-row inputs with stable height

### `adaptive`

`adaptive` nodes may need more height than their baseline.

- `units` is the baseline, not the cap
- `liveUnits` may rise above `baseUnits`
- shrink-back stops at `max(baseUnits, current child demand)`

Examples:

- folders and other expandable controls
- nested split containers
- unknown third-party controls
- custom control hosts without fixed declared height behavior

## Live Unit Propagation

Every node has:

- `baseUnits`
- `liveUnits`

Propagation rules:

- `row.liveUnits = max(row.baseUnits, max(children.liveUnits))`
- `column.liveUnits = max(column.baseUnits, sum(children.liveUnits))`

Consequences:

- a horizontal row grows to the tallest child
- a vertical column grows to the sum of its children
- a parent never shrinks below its own baseline
- a parent also never shrinks below current child demand

This replaces ad hoc height bookkeeping with one recursive rule.

## Empty and Hidden Nodes

### Empty Nodes

An intentionally empty node has:

- `baseUnits = 0`
- `liveUnits = 0` unless an explicit baseline is assigned later

This keeps placeholder slots from claiming height on their own.

### Hidden Nodes

A hidden node does not contribute current vertical demand.

- hidden nodes do not contribute `liveUnits`
- hidden nodes retain their `baseUnits` as their restore baseline

This means visible layout responds to what is actually on screen, while re-expansion still has a remembered baseline.

## Known, Unknown, and Custom Content

### Known Controls

First-class controls owned by this project should participate through explicit unit rules rather than fallback measurement whenever practical.

- known fixed controls expose stable `units`
- known adaptive controls expose stable `baseUnits` and dynamic `liveUnits`

### Unknown Third-Party Controls

Unknown controls default to:

- `adaptive`
- measured fallback

They should not be assumed fixed unless they explicitly opt in.

### Custom Control Host

Arbitrary DOM mounted into a split slot is treated as a custom control host, not as a separate legacy `leaf` concept.

- if it declares `units` or height behavior, use that declaration
- otherwise treat it like an unknown adaptive control

## Measurement Fallback

Measurement is a fallback path, not the main model.

The runtime should not define vertical sizing as "measure everything, then divide by unit size." Instead:

- compute known structure in units first
- measure only unknown or opt-out content

### Quantization

Measured pixel height is converted to integer units through named strategies:

- `safe` is the default
- `tight` is optional

`safe` means:

- quantize upward to the next integer unit
- prefer one extra `unit` over clipping or overlap risk

`tight` means:

- use a tighter quantization intended for content that is known not to clip near boundaries

Public docs should describe these as semantic modes, not as magic numeric flags.

### Recalculation Triggers

Measured adaptive content should recalculate on:

- first mount
- `ResizeObserver` notifications
- explicit expand/collapse transitions such as folder toggles
- interactive gutter changes
- explicit layout refresh points triggered by split runtime updates

The system should not rely on heavier continuous mutation watching as the default path.

## Interactive Gutters

Interactive gutters remain part of split-layout, but default to off.

Rules:

- gutter drag changes are session-only
- no restart persistence is required
- horizontal gutter behavior for `sizes` stays as already implemented
- when a vertical drag changes a node's height demand, the resulting integer value becomes that node's temporary `baseUnits`

This temporary baseline participates in later shrink-back calculations exactly like any other baseline for the rest of the session.

## Third-Party Extension Path

Third-party controls should have a lightweight optional way to cooperate with the split runtime.

Requirements:

- opt-in, never mandatory
- trivial to ignore
- trivial to add later by plugin authors

The preferred direction is a small declarative hook on the control root or controller that can say:

- fixed vs adaptive
- declared base `units`

If that hook is absent, the runtime falls back to adaptive measurement automatically.

This keeps the default experience simple while leaving a path for precise integration.

## Animation and Rendering Boundaries

- Vertical height changes should animate smoothly.
- Horizontal re-layout does not need matching animation guarantees.
- Nested `row` / `column` containers should update by recalculating `liveUnits` upward through the tree.
- The system should not rely on extra container categories such as `tp-split-root-column` to patch over missing height semantics.

The old `tp-split-root-column` direction-specific wrapper is not part of the intended long-term model and should be removed rather than strengthened.

## Migration and Documentation

Documentation should present split-layout with this vocabulary:

- `sizes` for horizontal distribution
- `units` for vertical baseline
- `row` / `column` for structure
- `custom control host` for mounted arbitrary DOM
- `fixed` / `adaptive` for height behavior

Documentation should stop centering the public explanation around:

- `leaf`
- `rowUnits`
- `height`
- multiple competing split geometry stories

## Testing Strategy

Tests should cover at least:

- `row` / `column` nesting with recursive `liveUnits` propagation
- shrink-back to `max(baseUnits, child demand)`
- empty-node behavior with `baseUnits = 0`
- hidden-node removal from current `liveUnits`
- known fixed controls
- known adaptive controls
- unknown adaptive measured fallback
- `safe` and `tight` quantization behavior
- folder expansion and collapse
- interactive gutter session baseline updates

## Implementation Constraints

- Keep the vertical model simple enough to reason about from unit arithmetic first.
- Avoid special-case logic that exists only to visually patch one demo case.
- Prefer a small number of explicit concepts over many convenience aliases.
- When the runtime must choose between clipping risk and one extra unit of height, default behavior should prefer safety.

## Acceptance Criteria

This design is complete when:

- split-layout has one documented vertical language: `units`
- `height` and `rowUnits` are rejected
- nested layouts follow the recursive `liveUnits` rules above
- unknown controls can participate safely without first-class integration work
- custom control hosts are documented without reviving `leaf` as the main abstraction
- interactive gutter changes remain optional and session-local
