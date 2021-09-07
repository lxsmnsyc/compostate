import {
  contextual,
  createContext,
  inject,
  provide,
} from 'compostate';

interface DOMContextMethods {
  connected(): void;
  disconnected(): void;
  adopted(): void;
  updated(): void;
}

type DOMContextKeys = keyof DOMContextMethods;

export type DOMContext = {
  [key in DOMContextKeys]: DOMContextMethods[key][];
};

const DOM_CONTEXT = createContext<DOMContext | undefined>(undefined);

export function createDOMContext<T>(cb: () => T): T {
  return contextual(() => {
    provide(DOM_CONTEXT, {
      connected: [],
      disconnected: [],
      adopted: [],
      updated: [],
    });
    return cb();
  });
}

export function runContext<K extends DOMContextKeys>(
  context: DOMContext,
  key: K,
  value?: Parameters<DOMContextMethods[K]>,
): void {
  context[key].forEach((callback) => {
    callback.apply(null, value as any);
  });
}

export function getDOMContext(): DOMContext {
  const context = inject(DOM_CONTEXT);
  if (context) {
    return context;
  }
  throw new Error('Attempt to read DOMContext');
}

export function onConnected(callback: DOMContextMethods['connected']): void {
  getDOMContext().connected.push(callback);
}

export function onDisconnected(callback: DOMContextMethods['disconnected']): void {
  getDOMContext().disconnected.push(callback);
}

export function onUpdated(callback: DOMContextMethods['updated']): void {
  getDOMContext().updated.push(callback);
}

export function onAdopted(callback: DOMContextMethods['adopted']): void {
  getDOMContext().adopted.push(callback);
}
