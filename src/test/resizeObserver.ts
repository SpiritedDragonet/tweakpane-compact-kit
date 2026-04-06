const activeObservers = new Set<ResizeObserverStub>();

export class ResizeObserverStub {
  private readonly callback: ResizeObserverCallback;
  private readonly targets = new Set<Element>();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    activeObservers.add(this);
  }

  observe(target: Element) {
    this.targets.add(target);
  }

  unobserve(target: Element) {
    this.targets.delete(target);
  }

  disconnect() {
    this.targets.clear();
    activeObservers.delete(this);
  }

  flush() {
    if (this.targets.size === 0) {
      return;
    }

    const entries = Array.from(this.targets).map((target) => ({
      target,
      contentRect: target.getBoundingClientRect(),
    })) as ResizeObserverEntry[];

    this.callback(entries, this as unknown as ResizeObserver);
  }
}

export function flushResizeObservers() {
  Array.from(activeObservers).forEach((observer) => observer.flush());
}

export function resetResizeObservers() {
  activeObservers.forEach((observer) => observer.disconnect());
  activeObservers.clear();
}
