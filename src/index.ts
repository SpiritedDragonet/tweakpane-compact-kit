// Tweakpane Compact Kit
// A compact layout toolkit for Tweakpane

export {
  SplitLayoutPlugin,
  type SplitDirection,
  type SplitLayoutNode,
  type SplitLayoutParams,
  type SizeExpression,
} from './core/SplitLayoutPlugin';

export {
  SizedButtonPlugin,
  type SizedButtonOptions,
} from './core/SizedButtonPlugin';

// Convenience bundle export for Tweakpane v4 registerPlugin
// Allows: pane.registerPlugin(CompactKitBundle)
import { SplitLayoutPlugin as _Split, } from './core/SplitLayoutPlugin';
import { SizedButtonPlugin as _Sized, } from './core/SizedButtonPlugin';

// Merge CSS from both plugins so Tweakpane can embed once per bundle
const _css = `${_Split.css ?? ''}\n${_Sized.css ?? ''}`;

export const CompactKitBundle = {
  id: 'tweakpane-compact-kit',
  css: _css,
  plugins: [_Split, _Sized],
};
