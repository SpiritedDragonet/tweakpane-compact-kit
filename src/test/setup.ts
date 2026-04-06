import { afterEach, vi } from 'vitest';

import { ResizeObserverStub, resetResizeObservers } from './resizeObserver';

vi.stubGlobal('ResizeObserver', ResizeObserverStub);

afterEach(() => {
  resetResizeObservers();
});
