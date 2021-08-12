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

function dispose(d: Cleanup[]) {
  for (let i = 0, len = d.length; i < len; i++) d[i]();
}
// Modified version of mapSample from S-array[https://github.com/adamhaile/S-array] by Adam Haile
export function map<T, U>(
  list: () => T[],
  mapFn: (v: T, i: Ref<number>) => U,
): () => U[] {
  let items: T[] = [];
  let mapped: U[] = [];
  let disposers: (() => void)[] = [];
  let len = 0;
  let indexes: Ref<number>[] = [];

  cleanup(() => dispose(disposers));

  return () => {
    const newItems = list() || [];
    let i: number;
    let j: number;

    function mapper() {
      let result: U | undefined;
      disposers[j] = batchCleanup(() => {
        const index = ref(j);
        indexes[j] = index;
        result = mapFn(newItems[j], index);
      });
      return result as U;
    }
    return untrack(() => {
      const newLen = newItems.length;
      let newIndices: Map<T, number>;
      let newIndicesNext: number[];
      let temp: U[];
      let tempdisposers: Cleanup[];
      let tempIndexes: Ref<number>[];
      let start: number;
      let end: number;
      let newEnd: number;
      let item: T;

      // fast path for empty arrays
      if (newLen === 0) {
        if (len !== 0) {
          dispose(disposers);
          disposers = [];
          items = [];
          mapped = [];
          len = 0;
          indexes = [];
        }
      } else if (len === 0) {
        // fast path for new create
        mapped = new Array<U>(newLen);
        for (j = 0; j < newLen; j++) {
          items[j] = newItems[j];
          mapped[j] = createRoot(mapper);
        }
        len = newLen;
      } else {
        temp = new Array<U>(newLen);
        tempdisposers = new Array<Cleanup>(newLen);
        tempIndexes = new Array<Ref<number>>(newLen);

        // skip common prefix
        for (
          start = 0, end = Math.min(len, newLen);
          start < end && items[start] === newItems[start];
          start++
        );

        // common suffix
        for (
          end = len - 1, newEnd = newLen - 1;
          end >= start && newEnd >= start && items[end] === newItems[newEnd];
          end--, newEnd--
        ) {
          temp[newEnd] = mapped[end];
          tempdisposers[newEnd] = disposers[end];
          tempIndexes[newEnd] = indexes[end];
        }

        // 0) prepare a map of all indices in newItems,
        // scanning backwards so we encounter them in natural order
        newIndices = new Map<T, number>();
        newIndicesNext = new Array<number>(newEnd + 1);
        for (j = newEnd; j >= start; j--) {
          item = newItems[j];
          i = newIndices.get(item)!;
          newIndicesNext[j] = i === undefined ? -1 : i;
          newIndices.set(item, j);
        }
        // 1) step through all old items and see if they can be found
        // in the new set; if so, save them in a temp array and
        // mark them moved; if not, exit them
        for (i = start; i <= end; i++) {
          item = items[i];
          j = newIndices.get(item)!;
          if (j !== undefined && j !== -1) {
            temp[j] = mapped[i];
            tempdisposers[j] = disposers[i];
            tempIndexes![j] = indexes[i];
            j = newIndicesNext[j];
            newIndices.set(item, j);
          } else disposers[i]();
        }
        // 2) set all the new values, pulling from the temp array if copied,
        // otherwise entering the new value
        for (j = start; j < newLen; j++) {
          if (j in temp) {
            mapped[j] = temp[j];
            disposers[j] = tempdisposers[j];
            indexes[j] = tempIndexes![j];
            indexes[j].value = j;
          } else mapped[j] = createRoot(mapper);
        }
        // 3) in case the new set is shorter than the old, set the length of the mapped array
        mapped = mapped.slice(0, (len = newLen));
        // 4) save a copy of the mapped items for the next update
        items = newItems.slice(0);
      }
      return mapped;
    });
  };
}