export const SHOWCASE_SECTION_KEYS = [
  'overview',
  'install',
  'quick-start',
  'first-split',
  'width-geometry',
  'custom-dom',
  'units-and-height-flow',
  'buttons',
  'compact-sliders-and-labels',
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
  'custom-dom': '3 Custom DOM',
  'units-and-height-flow': '4 Units And Height Flow',
  buttons: '5 Buttons',
  'compact-sliders-and-labels': '6 Compact Sliders And Labels',
  'composing-layouts': '7 Composing Layouts',
  'run-the-demo': 'Run the Demo',
};

export type ShowcaseSubsection = {
  key: string;
  section: ShowcaseSectionKey;
  title: string;
  screenshot: string;
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
    key: 'split-width-geometry',
    section: 'width-geometry',
    title: 'Width Geometry',
    screenshot: 'split-width-geometry.svg',
  },
  {
    key: 'split-custom-dom',
    section: 'custom-dom',
    title: 'Custom DOM',
    screenshot: 'split-custom-dom.svg',
  },
  {
    key: 'split-units-height-flow',
    section: 'units-and-height-flow',
    title: 'Units And Height Flow',
    screenshot: 'split-units-height-flow.svg',
  },
  {
    key: 'buttons-overview',
    section: 'buttons',
    title: 'Buttons Overview',
    screenshot: 'buttons-overview.svg',
  },
  {
    key: 'buttons-boolean-on',
    section: 'buttons',
    title: 'Buttons Boolean On',
    screenshot: 'buttons-boolean-on.svg',
  },
  {
    key: 'compact-sliders-compare',
    section: 'compact-sliders-and-labels',
    title: 'Compact Sliders Compare',
    screenshot: 'compact-sliders-compare.svg',
  },
  {
    key: 'compact-sliders-split-leaf',
    section: 'compact-sliders-and-labels',
    title: 'Compact Sliders Split Leaf',
    screenshot: 'compact-sliders-split-leaf.svg',
  },
  {
    key: 'composing-layouts',
    section: 'composing-layouts',
    title: 'Composing Layouts',
    screenshot: 'composing-layouts.svg',
  },
] as const;

export const README_SCREENSHOT_FILES = SHOWCASE_SUBSECTIONS.map((entry) => entry.screenshot);
