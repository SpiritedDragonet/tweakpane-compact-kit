# Tweakpane Compact Kit Maintainability Cleanup Design

## Summary

This design keeps the documented public API of `tweakpane-compact-kit` largely intact while reducing maintenance risk inside the implementation.

The cleanup focuses on four outcomes:

1. Preserve documented user-facing syntax where practical.
2. Remove undocumented aliases, hidden entry points, and ghost parameters.
3. Separate the split-layout core from Tweakpane-specific DOM hacks.
4. Add lightweight layout monitoring so compact hacks do not drift into obviously broken relative positioning.

## Goals

- Keep documented `split-layout` syntax working:
  - `sizes: number[]`
  - `sizes: 'equal'`
  - `sizes: '<n>fr ...'`
  - documented mixed size strings such as `200px 1fr 30%`
  - `rowUnits`
  - semantic `children` categories
  - `gutter`, `interactive`, `compactSliders`
- Make the meaning of `sizes`, `rowUnits`, and `height` explicit and testable.
- Reduce the size and responsibility overlap of `src/core/SplitLayoutPlugin.ts`.
- Preserve room for future Tweakpane hacks such as compact sliders and a boolean-button presentation hack without pushing those hacks back into the layout core.

## Non-Goals

- No broad visual redesign.
- No removal of documented syntax unless the implementation proves unsound and no compatible fix is available.
- No new public feature beyond internal cleanup and monitoring hooks needed to keep existing hacks sane.

## Supported Surface

### Keep

- `sizes: number[]`
- `sizes: 'equal'`
- `sizes` using `fr` strings
- documented mixed size strings
- `rowUnits`
- semantic leaf category names in `children`
- `gutter`
- `interactive`
- `compactSliders`
- `getSlots()`
- `getSlotsByCategory()`

### Remove or Reject

- undocumented `gap` alias
- undocumented shim entry points such as `addSplitLayout()`
- ghost parameters not implemented by core behavior
- silent acceptance of unknown parameter combinations where a clear error is feasible

## Semantic Rules

### `sizes`

`sizes` stays as the general layout sizing language for row and column splits.

Accepted forms:

- `number[]`
- `'equal'`
- pure `fr` strings such as `'1fr 2fr'`
- documented mixed strings such as `'200px 1fr 30%'`

Implementation rule:

- Parse `sizes` into a token model first.
- Resolve actual percentages only after container size is known.
- Do not approximate mixed units with arbitrary ratio math.

### `rowUnits`

`rowUnits` becomes a distinct semantic path and no longer reuses generic `sizes` normalization.

Accepted forms:

- `number[]`
- `'equal'`
- bare numeric strings such as `'1 1 2'`
- `fr` strings such as `'2fr 1fr 1fr'`

Rejected forms:

- `px`
- `%`

Rationale:

- `rowUnits` is named in terms of units, not physical lengths.
- Restricting it to unit-like inputs makes behavior predictable and easier to validate.

### `height`

`height` is defined consistently instead of depending on implicit branch behavior.

- Row split:
  - `height` sets the split container height.
  - `sizes` decides width distribution.
- Column split with `sizes` only:
  - `height` sets the total container height.
  - `sizes` distributes rows within that fixed height.
- Column split with `rowUnits` and no `height`:
  - total height is derived from unit height and gutter count.
- Column split with both `rowUnits` and `height`:
  - `height` fixes the total container height.
  - `rowUnits` distributes rows within that fixed height.

## Internal Architecture

Refactor the current monolithic `SplitLayoutPlugin` implementation into focused modules.

- `src/core/split/params.ts`
  - validates and normalizes supported input
  - rejects undocumented aliases and unsupported combinations
- `src/core/split/sizeExpressions.ts`
  - parses `sizes` syntax into a token model
- `src/core/split/rowUnits.ts`
  - parses `rowUnits` independently with unit-specific rules
- `src/core/split/layoutBuilder.ts`
  - builds DOM structure for split containers, panels, leaves, and nested layouts
- `src/core/split/interactiveGutters.ts`
  - owns pointer drag behavior and handle refresh
- `src/core/hacks/compactSliderPatch.ts`
  - owns compact slider DOM patching and layout sanity monitoring
- `src/core/shared/measure.ts`
  - owns shared unit-height probing and related measurement helpers

`src/core/SplitLayoutPlugin.ts` should remain as a thin composition layer that wires the above pieces together into the public plugin object.

## Hack Isolation

The split-layout core should not directly own Tweakpane DOM hacks.

The compact slider behavior moves into a dedicated hack layer with a narrow contract:

- input: a leaf root that may contain Tweakpane controls
- output: cleanup handle plus optional layout sanity observations

This boundary keeps the layout engine reusable and makes later hacks easier to add, including the proposed boolean-button presentation hack.

## Layout Sanity Monitoring

The cleanup should add lightweight monitoring for compact hacks so obviously broken relative positioning is caught during development and test verification.

Target relationships to monitor:

- slider surface vs value text on the right
- label/title in the upper-left vs slider track overlap
- label truncation behavior when width is constrained
- compact value placement staying inside the value box

Monitoring approach:

- After a hack patch runs, measure relevant bounding boxes.
- Assert broad sanity bounds rather than pixel-perfect positions.
- Examples:
  - title must remain inside the labeled view box
  - value text must remain inside the value box
  - slider track must not overlap value text beyond an allowed threshold
  - compact controls must not push content outside the leaf root

These checks should be implemented as dev/test helpers, not as production warnings visible to library consumers.

## Refactor Sequence

1. Extract shared measurement and pure parsing helpers without changing public behavior.
2. Introduce explicit `sizes`, `rowUnits`, and `height` semantics.
3. Remove undocumented aliases, shim entry points, and ghost parameters.
4. Move compact slider logic into the hack module.
5. Add parser tests, API tests, cleanup tests, and layout sanity checks.
6. Align README, API documentation, and demo usage with the final supported surface.

## Test Strategy

Minimum coverage for this cleanup:

- parser tests
  - `number[]`
  - `'equal'`
  - pure `fr`
  - documented mixed `sizes`
  - valid `rowUnits`
  - rejected `rowUnits` using `px/%`
- semantic tests
  - row split with `height`
  - column split with `sizes + height`
  - column split with `rowUnits` and derived height
  - column split with `rowUnits + height`
  - nested split layouts
- API tests
  - `getSlots()`
  - `getSlotsByCategory()`
- cleanup tests
  - observer disposal
  - handle disposal
- compact hack sanity tests
  - slider, value text, and title remain within acceptable relative bounds

## Risks

- The biggest regression risk is changing semantics while also moving files around.
- Compact slider behavior depends on Tweakpane internal DOM structure and will remain the most brittle area.
- Mixed unit `sizes` require real container-aware resolution; implementing this partially would be worse than the current state.

## Acceptance Criteria

- Documented public syntax remains available unless explicitly called out as unsupported.
- `rowUnits` behaves like units rather than recycled percentage math.
- Mixed `sizes` no longer rely on arbitrary approximations.
- Hidden aliases and extra entry points are removed.
- Compact slider behavior is isolated from the split-layout core.
- Verification includes broad layout sanity checks so slider track, right-side value text, and top-left title do not drift into obviously broken positions.
