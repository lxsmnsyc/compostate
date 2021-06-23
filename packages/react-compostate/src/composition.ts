import { effect } from 'compostate';
import { ErrorInfo } from 'react';

export type EffectCleanup = () => void;
export type EffectResult = EffectCleanup | void | undefined;
export type Effect = () => EffectResult;

interface CompositionContextMethods {
  mounted(): void;
  unmounted(): void;
  updated(): void;
  errorCaptured(error: Error, errorInfo: ErrorInfo): void;
  effect(): void;
}

type CompositionContextKeys = keyof CompositionContextMethods;

export type CompositionContext = {
  [key in CompositionContextKeys]: CompositionContextMethods[key][];
};

export function createCompositionContext(): CompositionContext {
  return {
    mounted: [],
    unmounted: [],
    updated: [],
    errorCaptured: [],
    effect: [],
  };
}

export function runCompositionContext<K extends CompositionContextKeys>(
  context: CompositionContext,
  key: K,
  value: Parameters<CompositionContextMethods[K]>,
): void {
  context[key].forEach((callback) => {
    callback(...value);
  });
}

let CURRENT_CONTEXT: CompositionContext;

export function pushCompositionContext(context: CompositionContext): () => void {
  const parentContext = CURRENT_CONTEXT;
  CURRENT_CONTEXT = context;

  return () => {
    CURRENT_CONTEXT = parentContext;
  };
}

export function onEffect(callback: Effect): void {
  if (CURRENT_CONTEXT) {
    CURRENT_CONTEXT.effect.push(() => {
      effect(callback);
    });
  } else {
    throw new Error(`
Invalid call for 'onEffect'.

The 'onEffect' hook should only be called in Component setups.
`);
  }
}

export function onMounted(callback: CompositionContextMethods['mounted']): void {
  if (CURRENT_CONTEXT) {
    CURRENT_CONTEXT.mounted.push(callback);
  } else {
    throw new Error(`
Invalid call for 'onMounted'.

The 'onMounted' hook should only be called in Component setups.
`);
  }
}

export function onUnmounted(callback: CompositionContextMethods['unmounted']): void {
  if (CURRENT_CONTEXT) {
    CURRENT_CONTEXT.unmounted.push(callback);
  } else {
    throw new Error(`
Invalid call for 'onUnmounted'.

The 'onUnmounted' hook should only be called in Component setups.
`);
  }
}

export function onUpdated(callback: CompositionContextMethods['updated']): void {
  if (CURRENT_CONTEXT) {
    CURRENT_CONTEXT.updated.push(callback);
  } else {
    throw new Error(`
Invalid call for 'onUpdated'.

The 'onUpdated' hook should only be called in Component setups.
`);
  }
}

export function onErrorCaptured(callback: CompositionContextMethods['errorCaptured']): void {
  if (CURRENT_CONTEXT) {
    CURRENT_CONTEXT.errorCaptured.push(callback);
  } else {
    throw new Error(`
Invalid call for 'onErrorCaptured'.

The 'onErrorCaptured' hook should only be called in Component setups.
`);
  }
}
