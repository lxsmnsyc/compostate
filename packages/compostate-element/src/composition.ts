interface ContextMethods {
  connected(): void;
  disconnected(): void;
  adopted(): void;
  updated(): void;
  errorCaptured(error: Error): void;
}

type ContextKeys = keyof ContextMethods;

export type Context = {
  [key in ContextKeys]: ContextMethods[key][];
};

export function createContext(): Context {
  return {
    connected: [],
    disconnected: [],
    adopted: [],
    updated: [],
    errorCaptured: [],
  };
}

export function runContext<K extends ContextKeys>(
  context: Context,
  key: K,
  value?: Parameters<ContextMethods[K]>,
): void {
  context[key].forEach((callback) => {
    callback.apply(null, value as any);
  });
}

let CURRENT_CONTEXT: Context;

export function pushContext(context: Context): () => void {
  const parentContext = CURRENT_CONTEXT;
  CURRENT_CONTEXT = context;

  return () => {
    CURRENT_CONTEXT = parentContext;
  };
}

export function onConnected(callback: ContextMethods['connected']): void {
  if (CURRENT_CONTEXT) {
    CURRENT_CONTEXT.connected.push(callback);
  } else {
    throw new Error(`
Invalid call for 'onConnected'.

The 'onConnected' hook should only be called in Component setups.
`);
  }
}

export function onDisconnected(callback: ContextMethods['disconnected']): void {
  if (CURRENT_CONTEXT) {
    CURRENT_CONTEXT.disconnected.push(callback);
  } else {
    throw new Error(`
Invalid call for 'onDisconnected'.

The 'onDisconnected' hook should only be called in Component setups.
`);
  }
}

export function onUpdated(callback: ContextMethods['updated']): void {
  if (CURRENT_CONTEXT) {
    CURRENT_CONTEXT.updated.push(callback);
  } else {
    throw new Error(`
Invalid call for 'onUpdated'.

The 'onUpdated' hook should only be called in Component setups.
`);
  }
}

export function onErrorCaptured(callback: ContextMethods['errorCaptured']): void {
  if (CURRENT_CONTEXT) {
    CURRENT_CONTEXT.errorCaptured.push(callback);
  } else {
    throw new Error(`
Invalid call for 'onErrorCaptured'.

The 'onErrorCaptured' hook should only be called in Component setups.
`);
  }
}

export function onAdopted(callback: ContextMethods['adopted']): void {
  if (CURRENT_CONTEXT) {
    CURRENT_CONTEXT.adopted.push(callback);
  } else {
    throw new Error(`
Invalid call for 'onAdopted'.

The 'onAdopted' hook should only be called in Component setups.
`);
  }
}
