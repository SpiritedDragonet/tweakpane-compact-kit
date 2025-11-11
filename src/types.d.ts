// Type declarations for Tweakpane to avoid build errors
declare module 'tweakpane' {
  export const VERSION: { major: number; minor: number; patch: number };
  export interface BladeApi<T = unknown> {
    controller: any;
    disabled: boolean;
    hidden: boolean;
    on(eventName: string, handler: Function): BladeApi<T>;
    off(eventName: string, handler: Function): BladeApi<T>;
    dispose(): void;
  }

  export interface PaneEvents {
    change?: (ev: any) => void;
  }

  export class Pane {
    constructor(config?: { container?: HTMLElement; title?: string });
    addBlade(params: any): BladeApi;
    addFolder(params: any): BladeApi;
    addButton(params: any): BladeApi;
    addBinding(object: any, key: string, params?: any): BladeApi;
    addSeparator(): void;
    registerPlugin(plugin: any): void;
    dispose(): void;
    on<E extends keyof PaneEvents>(event: E, handler: PaneEvents[E]): void;
    off<E extends keyof PaneEvents>(event: E, handler: PaneEvents[E]): void;
  }
}

declare module '@tweakpane/plugin-essentials' {
  const plugin: any;
  export = plugin;
}
