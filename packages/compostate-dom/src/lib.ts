import {
  untrack,
  createRoot,
  batchCleanup,
  ref,
  Cleanup,
  effect as cEffect,
  resource,
  contextual,
} from "compostate";
import type { JSX } from "./jsx";

export function root<T>(fn: (dispose: () => void) => T) {
  return createRoot(() => {
    let result;
    let currentCleanup: Cleanup | undefined;
    const dispose = () => {
      currentCleanup && currentCleanup();
    }
    currentCleanup = batchCleanup(() => {
      result = fn(dispose);
    });
    return result;
  });
}

export function effect<T>(fn: (prev?: T) => T, current?: T) {
  cEffect(() => {
    current = fn(current);
  })
}

// only updates when boolean expression changes
export function memo<T>(fn: () => T, equal?: boolean): () => T {
  const o = ref(untrack(fn));
  effect(prev => {
    const res = fn();
    (!equal || prev !== res) && (o.value = res);
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

export function withContext<P>(comp: Component<P>): Component<P> {
  return (props) => contextual(() => comp(props));
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
