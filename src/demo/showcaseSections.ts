export const SHOWCASE_SECTION_KEYS = [
  'overview',
  'install',
  'quick-start',
  'first-split',
  'width-geometry',
  'units-and-height-flow',
  'control-semantics',
  'composing-layouts',
  'run-the-demo',
] as const;

export type ShowcaseSectionKey = (typeof SHOWCASE_SECTION_KEYS)[number];

export const SHOWCASE_SECTION_TITLES: Record<ShowcaseSectionKey, string> = {
  overview: 'Overview',
  install: 'Install',
  'quick-start': 'Quick Start',
  'first-split': '1 First Split',
  'width-geometry': '2 Width Geometry',
  'units-and-height-flow': '3 Units And Height Flow',
  'control-semantics': '4 Control Semantics',
  'composing-layouts': '5 Composing Layouts',
  'run-the-demo': 'Run the Demo',
};

export type ShowcaseScreenshot = string | readonly [string, string];

export type ShowcaseSubsection = {
  key: string;
  section: ShowcaseSectionKey;
  title: string;
  screenshot: ShowcaseScreenshot;
  stateful?: boolean;
};

// This file is the contract shared by the live demo, screenshot export, and
// README checks. Keeping the approved order here prevents those three surfaces
// from silently drifting apart.
export const SHOWCASE_SUBSECTIONS: readonly ShowcaseSubsection[] = [
  {
    key: 'split-first-row',
    section: 'first-split',
    title: 'First Split',
    screenshot: 'split-first-row.svg',
  },
  {
    key: 'split-size-expressions',
    section: 'width-geometry',
    title: 'Width Geometry',
    screenshot: 'split-size-expressions.svg',
  },
  {
    key: 'split-mixed-dom',
    section: 'units-and-height-flow',
    title: 'Units And Height Flow',
    screenshot: 'split-mixed-dom.svg',
  },
  {
    key: 'button-boolean',
    section: 'control-semantics',
    title: 'Boolean Button',
    screenshot: ['button-boolean-off.svg', 'button-boolean-on.svg'],
    stateful: true,
  },
  {
    key: 'button-sized-actions',
    section: 'control-semantics',
    title: 'Sized Actions',
    screenshot: 'button-sized-actions.svg',
  },
  {
    key: 'compact-sliders',
    section: 'control-semantics',
    title: 'Compact Sliders',
    screenshot: ['compact-sliders-off.svg', 'compact-sliders-on.svg'],
    stateful: true,
  },
  {
    key: 'composing-layouts',
    section: 'composing-layouts',
    title: 'Composing Layouts',
    screenshot: 'composing-layouts.svg',
  },
] as const;

export const README_SCREENSHOT_FILES = SHOWCASE_SUBSECTIONS.flatMap((entry) =>
  Array.isArray(entry.screenshot) ? [...entry.screenshot] : [entry.screenshot],
);
