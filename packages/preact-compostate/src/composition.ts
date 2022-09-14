import {
  Effect,
  effect,
  inject,
  createContext,
  contextual,
  provide,
} from 'compostate';

interface CompositionContextMethods {
  mounted(): void;
  unmounted(): void;
  updated(): void;
  effect(): void;
}

type CompositionContextKeys = keyof CompositionContextMethods;

export type CompositionContext = {
  [key in CompositionContextKeys]: CompositionContextMethods[key][];
};

const COMPOSITION_CONTEXT = createContext<CompositionContext | undefined>(undefined);

export function createCompositionContext<T>(cb: () => T): T {
  return contextual(() => {
    provide(COMPOSITION_CONTEXT, {
      mounted: [],
      unmounted: [],
      effect: [],
      updated: [],
    });
    return cb();
  });
}

export function getCompositionContext(): CompositionContext {
  const context = inject(COMPOSITION_CONTEXT);
  if (context) {
    return context;
  }
  throw new Error('Attempt to read DOMContext');
}

export function runCompositionContext<K extends CompositionContextKeys>(
  context: CompositionContext,
  key: K,
): void {
  const method = context[key];
  for (let i = 0, len = method.length; i < len; i += 1) {
    method[i]();
  }
}

export function onEffect(callback: Effect): void {
  getCompositionContext().effect.push(() => {
    effect(callback);
  });
}

export function onMounted(callback: CompositionContextMethods['mounted']): void {
  getCompositionContext().mounted.push(callback);
}

export function onUnmounted(callback: CompositionContextMethods['unmounted']): void {
  getCompositionContext().unmounted.push(callback);
}

export function onUpdated(callback: CompositionContextMethods['updated']): void {
  getCompositionContext().updated.push(callback);
}
