import {
  untrack,
  createRoot,
  batchCleanup,
  ref,
  Cleanup,
  resource,
  contextual,
  errorBoundary,
  computation,
} from 'compostate';
import { JSX } from './jsx';

export function root<T>(fn: (dispose: () => void) => T): T {
  return createRoot(() => {
    let result: T | undefined;
    let currentCleanup: Cleanup | undefined;
    const dispose = () => {
      currentCleanup?.();
    };
    currentCleanup = batchCleanup(() => {
      result = fn(dispose);
    });
    return result as T;
  });
}

export const effect = computation;

// only updates when boolean expression changes
export function memo<T>(fn: () => T, equal?: boolean): () => T {
  const o = ref(untrack(fn));
  effect((prev) => {
    const res = fn();
    if (!equal || Object.is(prev, res)) {
      o.value = res;
    }
    return res;
  });
  return () => o.value;
}

type PropsWithChildren<P> = P & { children?: JSX.Element };
export type Component<P = {}> = (props: PropsWithChildren<P>) => JSX.Element;
export type ComponentProps<
  T extends keyof JSX.IntrinsicElements | Component<any>
> = T extends Component<infer P>
  ? P
  : T extends keyof JSX.IntrinsicElements
  ? JSX.IntrinsicElements[T]
  : {};

export function createComponent<T>(Comp: Component<T>, props: T): JSX.Element {
  return untrack(() => Comp(props));
}

export function withErrorBoundary<P>(Comp: Component<P>): Component<P> {
  return (props) => errorBoundary(() => Comp(props));
}

export function withContext<P>(Comp: Component<P>): Component<P> {
  return (props) => contextual(() => Comp(props));
}

export function lazy<P>(mod: () => Promise<Component<P>>): Component<P> {
  return (props) => {
    const data = resource(mod);

    return () => {
      if (data.status === 'success') {
        return data.value(props);
      }
      return undefined;
    };
  };
}
