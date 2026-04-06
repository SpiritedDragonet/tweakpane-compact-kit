/**
 * Host runtime for split-layout leaves.
 *
 * A host is any leaf container whose contents are mounted later or managed by
 * someone else. This runtime watches the host, computes live units on demand,
 * and reports a small `VerticalState` surface back to the layout builder.
 */
export type VerticalState = {
  getBaseUnits: () => number;
  getLiveUnits: () => number;
  setBaseUnits: (nextUnits: number) => void;
  refresh: () => void;
};

type CreateHostRuntimeOptions = {
  container: HTMLElement;
  resolveLiveUnits: () => number;
  refreshLayout: () => void;
  isDisposed: () => boolean;
  isElementHidden: (el: HTMLElement) => boolean;
  toUnits: (value: number) => number;
  disposers: Array<() => void>;
};

/**
 * Coalesces observer noise into one microtask refresh so same-turn DOM changes
 * resolve into a single layout pass.
 */
function scheduleMicrotask(run: () => void) {
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(run);
    return;
  }

  Promise.resolve().then(run).catch(() => {});
}

/**
 * Builds the runtime wrapper used for mounted leaf content.
 */
export function createHostRuntime(options: CreateHostRuntimeOptions): VerticalState {
  const {
    container,
    resolveLiveUnits,
    refreshLayout,
    isDisposed,
    isElementHidden,
    toUnits,
    disposers,
  } = options;

  let baseUnits = 0;
  let liveUnits = 0;
  let refreshQueued = false;

  const refreshHost = () => {
    liveUnits = resolveLiveUnits();
    refreshLayout();
  };

  // ResizeObserver and MutationObserver can both fire during the same turn. We
  // intentionally collapse them into one refresh to avoid redundant relayouts.
  const scheduleRefreshHost = () => {
    if (refreshQueued || isDisposed()) {
      return;
    }
    refreshQueued = true;

    scheduleMicrotask(() => {
      refreshQueued = false;
      if (isDisposed()) {
        return;
      }
      refreshHost();
    });
  };

  try {
    const resizeObserver = new ResizeObserver(() => {
      scheduleRefreshHost();
    });
    resizeObserver.observe(container);
    disposers.push(() => {
      resizeObserver.disconnect();
    });
  } catch {}

  try {
    const mutationObserver = new MutationObserver((records) => {
      const shouldRefresh = records.some((record) =>
        record.type === 'childList'
        || (record.type === 'attributes'
          && (record.attributeName === 'class' || record.attributeName === 'hidden')));

      if (shouldRefresh) {
        scheduleRefreshHost();
      }
    });
    mutationObserver.observe(container, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'hidden'],
    });
    disposers.push(() => {
      mutationObserver.disconnect();
    });
  } catch {}

  return {
    getBaseUnits: () => baseUnits,
    getLiveUnits: () => {
      // Hidden hosts contribute nothing even if they still remember their last
      // measured live units.
      if (isElementHidden(container)) {
        return 0;
      }
      return Math.max(baseUnits, liveUnits);
    },
    setBaseUnits: (nextUnits: number) => {
      const safeUnits = toUnits(nextUnits);
      if (safeUnits === baseUnits) {
        return;
      }
      baseUnits = safeUnits;
      refreshLayout();
    },
    refresh: refreshHost,
  };
}
