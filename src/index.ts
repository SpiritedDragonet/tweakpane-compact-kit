/**
 * Public package surface.
 *
 * The package intentionally exposes a small set of plugins plus one convenience
 * bundle. Most of the interesting behavior lives under `src/core`; this file is
 * the stable import point that library consumers see.
 */

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

/**
 * Convenience bundle for `pane.registerPlugin(...)`.
 *
 * Tweakpane expects one object that carries both CSS and the plugin list, so we
 * merge the individual plugin styles here instead of asking consumers to wire
 * them manually.
 */
import { SplitLayoutPlugin as _Split, } from './core/SplitLayoutPlugin';
import { SizedButtonPlugin as _Sized, } from './core/SizedButtonPlugin';
import { BooleanButtonPlugin as _Bool, } from './core/BooleanButtonPlugin';

// CSS is concatenated once here so Tweakpane injects one stylesheet payload for the bundle.
const _css = `${_Split.css ?? ''}\n${_Sized.css ?? ''}\n${_Bool.css ?? ''}`;

export const CompactKitBundle = {
  id: 'tweakpane-compact-kit',
  css: _css,
  plugins: [_Split, _Sized, _Bool],
};
