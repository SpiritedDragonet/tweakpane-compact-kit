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

export {
  BooleanButtonPlugin,
  type BooleanButtonOptions,
} from './core/BooleanButtonPlugin';

// Convenience bundle export for Tweakpane v4 registerPlugin
// Allows: pane.registerPlugin(CompactKitBundle)
import { SplitLayoutPlugin as _Split, } from './core/SplitLayoutPlugin';
import { SizedButtonPlugin as _Sized, } from './core/SizedButtonPlugin';
import { BooleanButtonPlugin as _Bool, } from './core/BooleanButtonPlugin';

// Merge CSS from both plugins so Tweakpane can embed once per bundle
const _css = `${_Split.css ?? ''}\n${_Sized.css ?? ''}\n${_Bool.css ?? ''}`;

export const CompactKitBundle = {
  id: 'tweakpane-compact-kit',
  css: _css,
  plugins: [_Split, _Sized, _Bool],
};
