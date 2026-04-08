import { CompactKitBundle } from '../index';

import {
  mountShowcaseDemoWithBundle,
  type ShowcaseMountOptions,
  type ShowcaseMountResult,
} from './showcaseMount';

export type { ShowcaseMountOptions, ShowcaseMountResult } from './showcaseMount';

export function mountShowcaseDemo(
  doc: Document,
  root: HTMLElement,
  options: ShowcaseMountOptions = {},
): ShowcaseMountResult {
  return mountShowcaseDemoWithBundle(CompactKitBundle, doc, root, options);
}
