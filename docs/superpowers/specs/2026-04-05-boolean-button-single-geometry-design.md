# Boolean Button and Single-Geometry Split Layout Design

## Summary

This design adds a first-class `boolean-button` binding view and unifies split-layout sizing under one geometric model.

The work has two linked goals:

1. Make button-like extensions feel native instead of like one-off hacks.
2. Make split-layout alignment follow one formula instead of multiple layout interpretations.

The result should support:

- multi-unit buttons
- icon + text button content
- boolean bindings rendered as pressed/unpressed buttons
- natural gutter alignment across rows when cumulative split proportions match

## Goals

- Add a public `boolean-button` view for boolean bindings.
- Keep `sized-button` as a public blade and upgrade it into the shared button foundation.
- Support multi-line text, icon-only, text-only, and icon + text button content.
- Support multi-unit height for both `sized-button` and `boolean-button`.
- Keep split-layout outer edges naturally aligned with full-width native Tweakpane controls.
- Replace the current split width interpretation with one documented geometric rule.
- Preserve the existing `Compact Sliders Toggle` demo and present the new boolean button beside it.

## Non-Goals

- No arbitrary DOM injection into button content.
- No broad visual redesign of the demo beyond the new button showcase and alignment examples.
- No separate "track mode" or "free mode" split interpretation.
- No promise that `px` and `%` mean final visible box width after gutter cuts.

## Public API

### `sized-button`

`sized-button` stays as a blade:

```ts
pane.addBlade({
  view: 'sized-button',
  units: 2,
  title: 'Monitor\nGraph',
  icon: {path: 'M3 12L7 8L10 10L13 4', viewBox: '0 0 16 16'},
  onClick: () => {},
});
```

Public shape:

```ts
type ButtonIcon =
  | string
  | {path: string; viewBox?: string};

type ButtonContent = {
  text?: string;
  icon?: ButtonIcon;
};

type SizedButtonParams = {
  view: 'sized-button';
  units?: number;
  title?: string;
  icon?: ButtonIcon;
  content?: ButtonContent;
  onClick?: () => void;
};
```

Rules:

- `title` remains supported for compatibility and maps to `content.text`.
- top-level `icon` remains a shorthand and maps to `content.icon`.
- the whole row is the button surface; there is no separate left label column.

### `boolean-button`

`boolean-button` is a binding view, not a separate parallel control system:

```ts
pane.addBinding(state, 'compact', {
  view: 'boolean-button',
  units: 2,
  content: {
    text: 'Compact Sliders',
    icon: {path: 'M3 8h10M5 4h6M5 12h6', viewBox: '0 0 16 16'},
  },
  contentOn: {
    text: 'Compact Sliders',
  },
  offColor: '#607089',
  onColor: '#d97706',
});
```

Public shape:

```ts
type BooleanButtonParams = {
  view: 'boolean-button';
  units?: number;
  title?: string;
  icon?: ButtonIcon;
  content?: ButtonContent;
  contentOn?: ButtonContent;
  offColor?: string;
  onColor?: string;
};
```

Rules:

- the bound value stays a plain boolean
- clicking toggles the bound boolean value
- `content` is the default/off-state content
- `contentOn` overrides `content` for the `true` state
- if `contentOn` omits a field, it inherits that field from `content`
- `title` and top-level `icon` are shorthand for the default/off-state content
- `false` and `true` may differ in text, icon, color, and pressed styling
- if no explicit `contentOn` is provided, the button may still differ visually through `onColor` and pressed styling alone

## Shared Button Architecture

This work should not add a second implementation branch for button-like controls. It should consolidate the current button path into one reusable stack.

### `buttonShell`

Responsibilities:

- reuse the native `.tp-btnv` / `.tp-btnv_b` button structure
- own width fill behavior
- own `units` height behavior
- own shared pressed/disabled/focus state wiring
- expose a single content mount point

### `buttonContent`

Responsibilities:

- render `text`, `icon`, or both
- support multi-line text
- support icon-only buttons
- support icon + text buttons without custom user DOM
- keep icon handling controlled and predictable

### `booleanButtonBindingView`

Responsibilities:

- read and write the boolean binding
- map `false` / `true` to the selected content and colors
- delegate all layout and content rendering to `buttonShell` and `buttonContent`

This split means "multi-unit button", "button with icon", and "boolean button" are not three separate features. They become three combinations of the same shared pieces.

## Split Layout Geometry

Split-layout should use one geometric model for all supported `sizes` syntaxes.

### Model

Let:

- `T` = actual container span on the split axis
- `g` = gutter width

The layout is computed on a virtual span:

- `V = T + g`

The declared `sizes` values define pre-cut spans on `V`. After each piece is assigned, the rendered box removes `g / 2` from both sides. Adjacent pieces therefore create a visible gap of exactly `g`.

### Consequences

- outer edges stay flush with the container instead of shrinking inward
- all `sizes` syntaxes use one interpretation
- alignment is determined by cumulative split proportion, not by any separate grid or track interpretation
- if two rows have a divider at the same cumulative proportion, those dividers align naturally

Examples:

- `20 80` aligns its first divider with `1fr 2fr 2fr`
- `1fr 2fr` aligns its first divider with the first divider of `equal equal equal`
- `66 34` stays in the same system without needing a separate fallback mode

### Syntax Semantics

All supported `sizes` inputs remain public:

- `number[]`
- `'equal'`
- pure `fr` strings
- mixed strings such as `200px 1fr 30%`

But they now share one semantic meaning:

- `number`, `fr`, `px`, and `%` describe the pre-cut split geometry
- they do not directly describe the final visible box width after gutter removal

That means:

- `200px` means a 200px pre-cut span in the split calculation
- `30%` means a 30% pre-cut span in the split calculation
- after the `g / 2` cuts on both sides, the visible box is narrower

This rule should be documented plainly in README so users do not assume CSS Grid or raw Flexbox semantics.

## Rendering and Visual Rules

- split-layout should not add extra outer half-gutters
- gutter exists between adjacent panes, not outside the row
- split-layout rows with full-row buttons should visually line up with native full-width Tweakpane buttons at the left and right edges
- `boolean-button` should look like a button in both states
- `false` uses an unpressed button treatment
- `true` uses a pressed button treatment and may use a distinct color

## Demo and Documentation

The demo should add a dedicated English-labeled section:

- `Button Extensions`

This area should:

- keep the existing `Compact Sliders Toggle`
- add the new `boolean-button` beside it instead of replacing it
- demonstrate at least one multi-unit icon + text boolean button
- make it easy to inspect relative positions of slider surface, right-side numeric text, and labels after the new work

The split demo should also include a compact alignment showcase using cases that should visibly align under the new formula:

- `equal equal equal`
- `1fr 2fr`
- `20 80`
- `1fr 2fr 2fr`

README updates should:

- explain the new `boolean-button`
- explain the shared button content model
- explain the single split geometry in plain language
- explicitly state the pre-cut meaning of `px` and `%`

## Test Strategy

Minimum coverage:

- split geometry tests
  - `equal`
  - `1fr 2fr`
  - `20 80`
  - `1fr 2fr 2fr`
  - `200px 1fr 30%`
- divider alignment tests
  - `20 80` first divider equals `1fr 2fr 2fr` first divider
  - `1fr 2fr` first divider equals `equal equal equal` first divider
- shared button content tests
  - text only
  - icon only
  - icon + text
  - multi-line text
- boolean button tests
  - click toggles boolean value
  - `contentOn` inherits from `content`
  - off/on content can differ
  - `units` height works through the shared shell
- regression tests
  - current `sized-button` shorthand syntax still works

## Risks

- The biggest semantic risk is user surprise around `px` and `%` no longer meaning final visible width.
- Button content abstraction can become bloated if arbitrary content is allowed; this design explicitly avoids that.
- The demo must be arranged carefully so visual verification remains easy instead of becoming noisier.

## Acceptance Criteria

- `boolean-button` exists as a public boolean binding view.
- `sized-button` and `boolean-button` share one button shell and one controlled content model.
- multi-unit icon + text boolean buttons work without special-case code paths.
- split-layout uses one documented geometric model for all supported `sizes` syntax.
- rows that share cumulative divider proportions align naturally.
- split rows remain visually flush with native full-width button edges.
- the demo keeps `Compact Sliders Toggle` and adds the new button showcase under an English section title.
