# Demo Section Order And Fixed Gauge Design

## Summary

This delta keeps the current guided-tour demo structure but makes two targeted
changes:

1. `Custom DOM` moves ahead of `Units And Height Flow`.
2. `Units And Height Flow` restores the interactive donut gauge on the right,
   but the gauge now has a stricter role: it is content living inside a fixed
   `4u` host, not a second custom-DOM lesson.

These changes keep the demo more legible without reopening the larger README
and showcase architecture.

## Goals

- Put the DOM contract before the height-flow contract.
- Make the `Units And Height Flow` screenshot visually informative again.
- Keep the right side of `Units And Height Flow` explicitly fixed at `4u`.
- Avoid blurring the boundary between the `Custom DOM` chapter and the height
  chapter.
- Keep screenshot keys stable where possible.

## Non-Goals

- No new demo chapters.
- No screenshot pipeline redesign.
- No new button or slider semantics in this pass.
- No renewed “measured fallback” explanation inside `Units And Height Flow`.

## Section Responsibilities

### 3 Custom DOM

This chapter teaches host contracts:

- declared DOM can publish its own span directly
- fallback DOM is only measured when no stronger contract exists
- measured content rounds upward to avoid clipping

### 4 Units And Height Flow

This chapter teaches vertical layout behavior:

- `units` is the only supported baseline field
- rows resolve to the tallest visible child
- columns resolve to the sum of visible children
- adaptive content can grow above baseline and shrink back to baseline
- fixed-span content can still react internally without changing its declared
  outer span

The right-hand visual should therefore be a fixed `4u` host containing a live
gauge driven by the left-side controls. The gauge demonstrates responsive
payload inside a stable span.

## Demo Behavior

The left side of `Units And Height Flow` remains the current control column:

- value slider
- thickness slider
- expandable `Details` folder
- rounded toggle
- detail level slider

The right side becomes a declared `4u` DOM host containing:

- the donut gauge SVG
- a short title such as `Fixed 4u Visual`
- a short caption reinforcing that only the payload changes

The host itself must continue publishing fixed units. Only the inner SVG should
update when the bindings change.

## Documentation Impact

- The numbered chapter order changes from `3 Units / 4 Custom DOM` to
  `3 Custom DOM / 4 Units`.
- README prose for both chapters should follow that same new order.
- The `Units And Height Flow` chapter should explicitly say the right box is a
  fixed `4u` visual host.

## Acceptance Criteria

- Demo section titles show `3 Custom DOM` and `4 Units And Height Flow`.
- README uses the same order.
- `Units And Height Flow` shows a live donut gauge on the right.
- The right-side host still publishes fixed `4u` units.
- `Custom DOM` remains the only chapter that explains measured fallback.
