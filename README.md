# Tweakpane Compact Kit

A compact layout toolkit for Tweakpane that provides space-efficient layouts and utilities for building dense control panels.

## Features

- **SplitLayout** - Create flexible row/column splits with draggable gutters
- **SizedButton** - Multi-line buttons with configurable heights
- **Auto-optimized styles** - Automatically applies compact styles including:
  - Slider height reduction (50% scaling)
  - Smart label positioning and truncation
  - Gap compensation for multi-row elements
  - Removal of unnecessary whitespace

## Installation

```bash
npm install tweakpane-compact-kit
```

## Quick Start

```typescript
import { Pane } from 'tweakpane';
import { SplitLayoutPlugin, SizedButtonPlugin } from 'tweakpane-compact-kit';

const pane = new Pane();

// Register the plugins
pane.registerPlugin(SplitLayoutPlugin);
pane.registerPlugin(SizedButtonPlugin);
```

## Core Features

### 1. SplitLayout Plugin

Create flexible split layouts with draggable gutters between panes.

#### Basic Usage

```typescript
// Simple two-column layout
const splitApi = pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: [40, 60], // percentages
  children: ['leaf', 'leaf'],
});

// Get slots to mount child panes
const slots = splitApi.getSlots();
const leftPane = new Pane({ container: slots[0] });
const rightPane = new Pane({ container: slots[1] });

// Add controls to child panes
leftPane.addBinding(params, 'prop1');
rightPane.addBinding(params, 'prop2');
```

#### Using Custom Categories

**Design Philosophy**: Instead of just using `'leaf'` for all slots, you can use **any string** as a semantic category label. This allows you to organize and identify slots by their purpose, making it easier to manage complex layouts with many controls.

**Why use custom categories?**
- Organize controls by functional groups (e.g., 'audio', 'video', 'effects')
- Fill slots programmatically based on their purpose
- Create multiple similar controls for the same category
- Maintain clean, self-documenting code

**Example: Audio Mixer with Multiple Tracks**

```typescript
// Create a mixer layout with multiple tracks + master
const mixerApi = pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: 'equal',
  children: ['track', 'track', 'track', 'master'], // Semantic categories
});

// Define track parameters
const tracks = [
  { name: 'Vocals', volume: 0.8, pan: 0, muted: false },
  { name: 'Guitar', volume: 0.6, pan: -0.3, muted: false },
  { name: 'Drums', volume: 0.9, pan: 0.2, muted: false },
];

const masterParams = { volume: 1.0, limiter: true };

// Fill track slots programmatically
const trackSlots = mixerApi.getSlotsByCategory('track');
trackSlots.forEach((slot, index) => {
  const trackPane = new Pane({ container: slot, title: tracks[index].name });
  trackPane.addBinding(tracks[index], 'volume', { min: 0, max: 1 });
  trackPane.addBinding(tracks[index], 'pan', { min: -1, max: 1 });
  trackPane.addBinding(tracks[index], 'muted');
});

// Fill master slot separately
const masterSlots = mixerApi.getSlotsByCategory('master');
masterSlots.forEach(slot => {
  const masterPane = new Pane({ container: slot, title: 'Master' });
  masterPane.addBinding(masterParams, 'volume', { min: 0, max: 1 });
  masterPane.addBinding(masterParams, 'limiter');
});

// Later, if you need to update all track controls:
trackSlots.forEach((slot, i) => {
  // Access track-specific controls
  const trackData = tracks[i];
  console.log(`Track ${i}: ${trackData.name}, Volume: ${trackData.volume}`);
});
```

**Example: Video Editor Layout**

```typescript
// Organize by functional areas
const editorApi = pane.addBlade({
  view: 'split-layout',
  direction: 'column',
  children: [
    {
      view: 'split-layout',
      direction: 'row',
      sizes: [250, '1fr', 250],
      children: ['source', 'timeline', 'effects']
    },
    {
      view: 'split-layout',
      direction: 'row',
      sizes: 'equal',
      children: ['export', 'preview']
    }
  ]
});

// Get all slots organized by purpose
const slotMap = editorApi.getSlotsByCategoryMap();

// Fill each functional area
slotMap.get('source')?.forEach(slot => {
  const sourcePane = new Pane({ container: slot });
  sourcePane.addBinding(project, 'inputFile');
  sourcePane.addBinding(project, 'startTime');
  sourcePane.addBinding(project, 'duration');
});

slotMap.get('timeline')?.forEach(slot => {
  const timelinePane = new Pane({ container: slot });
  timelinePane.addBinding(timeline, 'currentFrame');
  timelinePane.addBinding(timeline, 'playbackRate');
});

slotMap.get('effects')?.forEach(slot => {
  const fxPane = new Pane({ container: slot });
  fxPane.addBinding(effects, 'brightness', { min: -1, max: 1 });
  fxPane.addBinding(effects, 'contrast', { min: -1, max: 1 });
  fxPane.addBinding(effects, 'saturation', { min: 0, max: 2 });
});

slotMap.get('export')?.forEach(slot => {
  const exportPane = new Pane({ container: slot });
  exportPane.addBinding(exportSettings, 'format', {
    options: { MP4: 'mp4', WebM: 'webm', AVI: 'avi' }
  });
  exportPane.addBinding(exportSettings, 'quality', { min: 0, max: 100 });
});

slotMap.get('preview')?.forEach(slot => {
  const previewPane = new Pane({ container: slot });
  previewPane.addBinding(preview, 'resolution');
  previewPane.addBinding(preview, 'fps');
});
```

**Utility Methods:**

```typescript
// Get all unique categories used in the layout
const categories = splitApi.getCategories();
console.log(categories); // ['track', 'master']

// Get slots for a specific category
const trackSlots = splitApi.getSlotsByCategory('track');
console.log(`Found ${trackSlots.length} track slots`);

// Get all slots organized by category
const slotsByCategory = splitApi.getSlotsByCategoryMap();
slotsByCategory.forEach((slots, category) => {
  console.log(`${category}: ${slots.length} slot(s)`);
});
```

#### Size Expressions

Multiple ways to specify sizes:

```typescript
// Array of percentages (automatically normalized)
sizes: [30, 40, 30]  // → [30, 40, 30] (sum = 100)
sizes: [1, 2, 1]     // → [25, 50, 25] (sum = 4, normalized to 100)
sizes: [2, 3, 5]     // → [20, 30, 50] (sum = 10, normalized to 100)
sizes: [100, 200]    // → [33.33, 66.67] (sum = 300, normalized to 100)

// CSS Grid-like syntax
sizes: '1fr 2fr 1fr'
sizes: '300px 1fr'
sizes: '100px 200px auto'

// Equal distribution
sizes: 'equal'
sizes: { equal: 3 }

// Ratio-based
sizes: { ratio: [1, 2, 1] }

// Auto-sized columns
sizes: { auto: 4 }

// Min/max constraints
sizes: [
  { min: 200, max: 400 },
  { min: 300 },
  { min: 200, max: 500 }
]
```

#### Layout Presets

Built-in presets for common layouts:

```typescript
// Sidebar layout: 300px | 1fr
const sidebar = pane.addBlade({
  view: 'split-layout',
  sizes: 'sidebar',
  children: ['leaf', 'leaf'],
});

// Three equal panels
const panels = pane.addBlade({
  view: 'split-layout',
  sizes: 'panels',
  children: ['leaf', 'leaf', 'leaf'],
});

// Main content with sidebar
const mainSidebar = pane.addBlade({
  view: 'split-layout',
  sizes: 'main-sidebar',
  children: ['leaf', 'leaf'],
});

// Golden ratio layout
const golden = pane.addBlade({
  view: 'split-layout',
  sizes: 'golden',
  children: ['leaf', 'leaf'],
});
```

All available presets:
- `'sidebar'` - 300px | 1fr
- `'panels'` - 1fr | 1fr | 1fr (three equal panels)
- `'main-sidebar'` - 1fr | 250px
- `'header-main'` - auto | 1fr
- `'triple'` - 1fr 2fr 1fr
- `'golden'` - 0.618fr | 1fr

#### Nested Layouts

```typescript
const nested = pane.addBlade({
  view: 'split-layout',
  direction: 'column',
  children: [
    'leaf', // Top pane
    {
      view: 'split-layout',
      direction: 'row',
      sizes: 'equal',
      children: ['leaf', 'leaf'] // Nested row split
    }
  ],
});
```

#### Configuration Options

```typescript
const splitApi = pane.addBlade({
  view: 'split-layout',
  direction: 'row', // 'row' or 'column'
  sizes: [50, 50],
  children: ['leaf', 'leaf'],
  gutter: 8, // Gutter size in pixels (default: 6)
  minSize: 10, // Minimum size percentage (default: 5)
  height: 200, // Only for column direction
  interactive: true, // Enable dragging (default: true)
});
```

### 2. Sized Button Plugin

Create buttons that span multiple blade rows:

```typescript
// Single-line button (default)
pane.addBlade({
  view: 'sized-button',
  title: 'Normal Button',
  onClick: () => console.log('Clicked!')
});

// Multi-line button
pane.addBlade({
  view: 'sized-button',
  title: 'Multi-line\nButton',
  units: 3, // Span 3 blade rows
  onClick: () => console.log('Big button clicked!')
});
```

#### Options

- `title?: string` - Button text
- `units?: number` - Number of blade rows to span (default: 1)
- `onClick?: () => void` - Click handler

### 3. Usage Notes

Both plugins use the standard Tweakpane blade syntax:

```typescript
// Split layout
pane.addBlade({
  view: 'split-layout',
  // ... options
});

// Sized button
pane.addBlade({
  view: 'sized-button',
  // ... options
});
```

## Auto-Optimized Styles

The plugin automatically applies compact styles:

### Slider Optimization

- Sliders are scaled to 50% height
- Labels are positioned as overlays with 60% width truncation
- Numeric inputs are scaled and positioned at top-right
- Drag handles are hidden for cleaner appearance

```typescript
// These styles are applied automatically when using SplitLayout
// No additional configuration needed
```

### Gap Compensation

Multi-row elements automatically compensate for gaps:

```typescript
// SizedButton automatically adds gap compensation
pane.addBlade({
  view: 'sized-button',
  title: 'Tall Button',
  units: 3 // Height = 3 * unitSize + 2 * gapSize
});
```

## TypeScript Support

Full TypeScript definitions included:

```typescript
import type {
  SplitDirection,
  SizeExpression,
  LayoutPreset,
  SizedButtonOptions
} from 'tweakpane-compact-kit';
```

## Examples

### Complete Control Panel

```typescript
import { Pane } from 'tweakpane';
import {
  SplitLayoutPlugin,
  SizedButtonPlugin
} from 'tweakpane-compact-kit';

const pane = new Pane();
pane.registerPlugin(SplitLayoutPlugin);
pane.registerPlugin(SizedButtonPlugin);

// Create main layout
const main = pane.addBlade({
  view: 'split-layout',
  direction: 'column',
  children: [
    // Header with button
    {
      view: 'split-layout',
      direction: 'row',
      sizes: [200, '1fr'],
      children: ['leaf', 'leaf']
    },
    // Main content area
    {
      view: 'split-layout',
      direction: 'row',
      sizes: 'sidebar',
      children: ['leaf', 'leaf']
    }
  ]
});

// Fill slots
const slots = main.getSlots();

// Header left - Add button
const headerLeft = new Pane({ container: slots[0] });
headerLeft.addBlade({
  view: 'sized-button',
  title: 'Execute',
  units: 2,
  onClick: () => runAction()
});

// Header right - Title
const headerRight = new Pane({ container: slots[1] });
headerRight.addBinding({ title: 'Control Panel' }, 'title');

// Sidebar - Settings
const sidebar = new Pane({ container: slots[2] });
sidebar.addFolder({ title: 'Settings' });
sidebar.addBinding(config, 'option1');
sidebar.addBinding(config, 'option2');

// Main area - Main controls
const mainArea = new Pane({ container: slots[3] });
mainArea.addBinding(params, 'mainValue');
mainArea.addBinding(params, 'enabled');
```


## API Reference

### Types

```typescript
type SplitDirection = 'row' | 'column';

type SizeExpression =
  | number[]                           // [100, 200] - pixels
  | string[]                          // ['100px', '2fr', '30%']
  | string                            // '1fr 2fr 1fr'
  | 'equal'                           // Equal distribution
  | { equal: number }                 // Equal split into N parts
  | { ratio: number[] }               // Ratio-based
  | { auto: number }                  // N auto-sized columns
  | { min: number, max?: number }[];  // Min/max constraints

type LayoutPreset =
  | 'sidebar' | 'panels' | 'main-sidebar'
  | 'header-main' | 'triple' | 'golden';

type SizedButtonOptions = {
  title?: string;
  units?: number;
  onClick?: () => void;
};
```

### Methods

#### SplitLayoutApi Methods
- `getSlots(): HTMLElement[]` - Get all slot containers
- `getSlotsByCategory(category: string): HTMLElement[]` - Get slots of a specific category
- `getCategories(): string[]` - Get all unique category names
- `getSlotsByCategoryMap(): Map<string, HTMLElement[]>` - Get slots grouped by category

#### Helper Functions
- `addSplitLayout(host, params)` - Create a split layout

## License

MIT

## Contributing

Welcome! Please feel free to submit issues and pull requests.