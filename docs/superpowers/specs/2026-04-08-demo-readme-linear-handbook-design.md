# Demo And README Linear Handbook Design

## Summary

The current demo and README are closer to a compact showcase than to a small
developer handbook. The next pass should keep the same plugin surface, but
restructure the teaching flow so each chapter explains one contract clearly and
the demo visuals stop mixing unrelated ideas together.

The new guided tour stays linear and flat:

1. `First Split`
2. `Width Geometry`
3. `Units And Height Flow`
4. `Custom DOM`
5. `Buttons`
6. `Compact Sliders And Labels`
7. `Composing Layouts`

`Overview`, `Install`, `Quick Start`, and `Run the Demo` remain unnumbered.

## Goals

- Turn the README and live demo into one small handbook instead of a loose
  showcase.
- Keep one flat `1..N` chapter sequence instead of nested big/small chapters.
- Make each numbered section teach one contract only.
- Separate `Custom DOM` from `Units And Height Flow` so the vertical unit model
  is not polluted by DOM fallback discussion.
- Merge boolean-button and sized-button teaching into one shared `Buttons`
  chapter because they share one content model.
- Keep `Compact Sliders And Labels` separate because slider layout semantics
  are not the same as button semantics.
- Keep `Composing Layouts` as the final integrated proof section.

## Non-Goals

- No new public plugin feature is required for this pass.
- No redesign of the split geometry or unit model itself.
- No extra appendix or API reference chapter.
- No hierarchy like `4.1`, `4.2`, or `1/7`.
- No repetition where the demo and README both explain the same concept twice in
  different chapter shapes.

## Core Teaching Rule

Every numbered section must answer one main question:

- `1 First Split`: what is a split structurally?
- `2 Width Geometry`: how does horizontal sizing work?
- `3 Units And Height Flow`: how does vertical span flow work?
- `4 Custom DOM`: how does non-pane DOM join the same system?
- `5 Buttons`: how do the custom button views share one content contract while
  preserving their different semantics?
- `6 Compact Sliders And Labels`: how does compact slider layout differ from the
  native slider without changing value semantics?
- `7 Composing Layouts`: do the earlier rules still hold when combined?

If an example mainly teaches another section's rule, it should move there.

## Shared Chapter Order

The demo and README should use the same visible numbered order:

1. `First Split`
2. `Width Geometry`
3. `Units And Height Flow`
4. `Custom DOM`
5. `Buttons`
6. `Compact Sliders And Labels`
7. `Composing Layouts`

The numbers exist only to communicate reading order. They are not progress
fractions and should not be written as `1/7`, `2/7`, and so on.

## Section Design

### 1 First Split

Purpose:

- teach the smallest structural split mental model

The visible example should include:

- one split root
- one wrapped child pane
- one plain DOM host
- no folder, compact slider, or button-state complexity

The README chapter must explain:

- `split-layout` is structural
- `children` define slots
- string children create semantic leaves
- nested split nodes are still structural children
- `getSlots()` and `getSlotsByCategory()` expose the mounted slots
- `wrapPane()` is the standard child-pane path inside split slots

### 2 Width Geometry

Purpose:

- teach the horizontal sizing contract only

The visible example should show only width expressions:

- `equal`
- `2fr 1fr`
- `20% 80%`
- `200px 1fr 30%`

The previous extra example with overlapping teaching value should be removed.

The README chapter must explain:

- there is one horizontal geometry model
- `px` and `%` reserve width first
- `fr` and bare numbers divide the remainder
- gutter alignment falls out of the same rule for every token
- mixed expressions are normal, not a special mode

### 3 Units And Height Flow

Purpose:

- teach the vertical span model without mixing in DOM fallback behavior

The visible example should show:

- a left-side control column with a stable baseline height
- a folder that can expand and increase live units
- a right-side gray dashed `4u` placeholder box, not a real custom DOM example

The right-side placeholder should make the geometry obvious:

- initial row height is `4u`
- expanding the left folder pushes the row above `4u`
- the row height is controlled by `max(left, right)` because this is a row node

The README chapter must explain:

- `units` is the only vertical baseline field
- `rowUnits` and `height` remain retired
- row nodes resolve to the tallest visible child
- column nodes resolve to the sum of visible children
- adaptive content can grow above baseline
- shrink-back returns to the node baseline or inherited max-floor rather than to
  arbitrary stale measurement

### 4 Custom DOM

Purpose:

- teach the DOM participation contract directly

This chapter should use one side-by-side screenshot:

- left: `Declared Span DOM`
- right: `Measured Fallback DOM`

The left example should:

- explicitly declare a fixed span such as `4u`
- stay visually stable
- represent the preferred path when the author knows the intended span

The right example should:

- intentionally contain content that grows taller than a trivial card
- visibly demonstrate that the layout can fall back to measured height
- be explained as a fallback path, not as a peer recommendation

Terminology:

- retire the phrase `unknown DOM`
- use `Declared Span DOM` and `Measured Fallback DOM`

The README chapter must explain the real resolution order:

1. known native or compact-kit control semantics
2. explicitly declared DOM unit metadata
3. measured fallback when no stronger contract is available

### 5 Buttons

Purpose:

- explain the shared button content model and the different control semantics in
  one place

This chapter should merge what used to be separated artificially:

- `boolean-button`
- `sized-button`
- text-only content
- icon-only content
- mixed icon+text content
- `contentOn` state changes

The screenshot plan should use:

- one static overview image showing both button kinds and the main content
  shapes
- one boolean on-state image showing the `contentOn` delta

The README chapter must explain:

- `boolean-button` preserves boolean binding semantics
- `sized-button` preserves stateless action semantics
- `content` is the normalized long form
- `title` and top-level `icon` are shorthand
- `contentOn` only overrides the fields it provides
- mixed icon+text layout uses a stable icon rail so icon position does not drift
  when text length changes

### 6 Compact Sliders And Labels

Purpose:

- explain compact slider layout and label normalization without button noise

The screenshot plan should use:

- one native-vs-compact static comparison
- one split-leaf example showing compact slider alignment inside wrapped panes

The README chapter must explain:

- `compactSliders` changes layout only, not value semantics
- native slider labels, compact slider top labels, and split-leaf label
  normalization are related but not identical concepts
- wrapped panes normalize native inset/label assumptions so compact sliders do
  not drift inside split leaves

### 7 Composing Layouts

Purpose:

- act as the final integration proof, not as another place to introduce new
  rules

The visible example should continue to combine:

- semantic slots
- nested rows and columns
- folder growth
- DOM hosts
- multi-unit controls
- compact slider treatment

The README chapter should point back to earlier chapters instead of re-teaching
them.

## Screenshot Policy

The screenshot inventory should stay compact and intentional:

- `1 First Split`: one image
- `2 Width Geometry`: one image
- `3 Units And Height Flow`: one image
- `4 Custom DOM`: one side-by-side image
- `5 Buttons`: two images
- `6 Compact Sliders And Labels`: two images
- `7 Composing Layouts`: one image

That keeps the README visual load close to the current size while making each
image more specific.

## Demo Page Rules

- The live page should feel like one short manual, not like a component gallery.
- Section subtitles should be rule sentences.
- Sections should not repeat the same visual pattern just to prove a tiny API
  difference.
- Interactivity can remain in the demo, but README screenshots should prefer
  stable static states that match the chapter text.

## README Rules

- Each numbered chapter should follow the same rhythm:
  - heading
  - image
  - one or two paragraphs of natural language
  - collapsible code block
- API points should be absorbed into the chapter where their behavior is
  explained.
- The README should explain the contract first and treat the screenshot as
  evidence, not as the explanation itself.

## Known Problem This Design Intentionally Fixes

The current `Units And Height Flow` example mixes the vertical unit story with a
custom DOM example. That makes it possible for the right side to look like it
starts at one apparent span and then appear to change after the left folder
expands.

This is the wrong teaching shape for that chapter.

The redesign fixes it by:

- removing custom DOM from `Units And Height Flow`
- moving DOM behavior into `Custom DOM`
- making the `Units And Height Flow` right side a neutral `4u` placeholder
  instead of a separate contract demonstration

## Acceptance Criteria

This redesign is complete when:

- the demo and README both use the seven numbered chapters above
- the chapter order is identical on both surfaces
- `Custom DOM` is a standalone chapter
- `Buttons` is a single merged chapter
- `Compact Sliders And Labels` is a standalone chapter
- `Units And Height Flow` no longer demonstrates custom DOM fallback behavior
- the README uses `Declared Span DOM` and `Measured Fallback DOM` terminology
- the button chapter clearly explains the shared content model and semantic
  differences
- the slider chapter clearly explains compact layout and label normalization
- `Composing Layouts` remains the final proof section
