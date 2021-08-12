import {
  untrack,
  createRoot,
  batchCleanup,
  Ref,
  ref,
  Cleanup,
  effect as cEffect,
  onCleanup,
  resource,
  contextual,
} from "compostate";
import type { JSX } from "./jsx";

export interface Context {
  id: symbol;
  Provider: (props: any) => any;
  defaultValue: unknown;
}

export const untracked = untrack;

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

export const cleanup = onCleanup

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


export function createSelector<T, U extends T>(
  source: () => T,
  fn: (a: U, b: T) => boolean = (a, b) => a === b
){
  let subs = new Map();
  let v: T;
  effect((p?: U) => {
    v = source();
    const keys = [...subs.keys()];
    for (let i = 0, len = keys.length; i < len; i++) {
      const key = keys[i];
      if (fn(key, v) || p !== undefined && fn(key, p)) {
        const o = subs.get(key);
        o.value = null;
      }
    }
    return v as U;
  });
  return (key: U) => {
    let l: Ref<U | undefined> & { _count?: number };
    if (!(l = subs.get(key))) subs.set(key, l = ref<any>(undefined));
    l.value;
    l._count ? (l._count++) : (l._count = 1);
    cleanup(() => l._count! > 1 ? l._count!-- : subs.delete(key))
    return fn(key, v);
  };
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


export function splitProps<T extends object, K1 extends keyof T>(
  props: T,
  ...keys: [K1[]]
): [Pick<T, K1>, Omit<T, K1>];
export function splitProps<T extends object, K1 extends keyof T, K2 extends keyof T>(
  props: T,
  ...keys: [K1[], K2[]]
): [Pick<T, K1>, Pick<T, K2>, Omit<T, K1 | K2>];
export function splitProps<
  T extends object,
  K1 extends keyof T,
  K2 extends keyof T,
  K3 extends keyof T
>(
  props: T,
  ...keys: [K1[], K2[], K3[]]
): [Pick<T, K1>, Pick<T, K2>, Pick<T, K3>, Omit<T, K1 | K2 | K3>];
export function splitProps<
  T extends object,
  K1 extends keyof T,
  K2 extends keyof T,
  K3 extends keyof T,
  K4 extends keyof T
>(
  props: T,
  ...keys: [K1[], K2[], K3[], K4[]]
): [Pick<T, K1>, Pick<T, K2>, Pick<T, K3>, Pick<T, K4>, Omit<T, K1 | K2 | K3 | K4>];
export function splitProps<
  T extends object,
  K1 extends keyof T,
  K2 extends keyof T,
  K3 extends keyof T,
  K4 extends keyof T,
  K5 extends keyof T
>(
  props: T,
  ...keys: [K1[], K2[], K3[], K4[], K5[]]
): [
  Pick<T, K1>,
  Pick<T, K2>,
  Pick<T, K3>,
  Pick<T, K4>,
  Pick<T, K5>,
  Omit<T, K1 | K2 | K3 | K4 | K5>
];
export function splitProps<T>(props: T, ...keys: [(keyof T)[]]) {
  const descriptors = Object.getOwnPropertyDescriptors(props),
    split = (k: (keyof T)[]) => {
      const clone: Partial<T> = {};
      for (let i = 0; i < k.length; i++) {
        const key = k[i];
        if (descriptors[key]) {
          Object.defineProperty(clone, key, descriptors[key]);
          delete descriptors[key];
        }
      }
      return clone;
    };
  return keys.map(split).concat(split(Object.keys(descriptors) as (keyof T)[]));
}
