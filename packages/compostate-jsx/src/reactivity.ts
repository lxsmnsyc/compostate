import {
  capturedBatchCleanup,
  capturedErrorBoundary,
  batchCleanup,
  Cleanup,
  computed,
  createRoot,
  onCleanup,
  ref,
  Ref,
  untrack,
  track,
} from 'compostate';

import { PROVIDER, setProvider } from './provider';
import { setSuspense, SUSPENSE } from './suspense';
import { Derived, ShallowReactive } from './types';

export function derived<T>(value: () => T): Derived<T> {
  // Capture current contexts
  const currentSuspense = SUSPENSE;
  const currentProvider = PROVIDER;
  return {
    derive: () => {
      // Capture currently running context
      const parentSuspense = SUSPENSE;
      const parentProvider = PROVIDER;
      // Repush captured contexts
      setSuspense(currentSuspense);
      setProvider(currentProvider);
      try {
        return capturedBatchCleanup(capturedErrorBoundary(value))();
      } finally {
        setProvider(parentProvider);
        setSuspense(parentSuspense);
      }
    },
  };
}

function dispose(d: Cleanup[]) {
  for (let i = 0; i < d.length; i += 1) d[i]();
}

// https://github.com/solidjs/solid/blob/main/packages/solid/src/reactive/array.ts#L8
export function mapArray<T, U>(
  list: ShallowReactive<T[] | undefined | null>,
  mapFn: ShallowReactive<(v: T, i: Ref<number>) => U>,
): Ref<U[]> {
  let items: T[] = [];
  let mapped: U[] = [];
  let disposers: (() => void)[] = [];
  let len = 0;
  let indexes: Ref<number>[] = [];

  onCleanup(() => dispose(disposers));

  let derivedList: (() => T[] | undefined | null);

  if (list == null) {
    derivedList = () => null;
  } else if ('derive' in list) {
    derivedList = list.derive;
  } else if (Array.isArray(list)) {
    derivedList = () => track(list);
  } else {
    derivedList = () => list.value;
  }

  let derivedMap: () => (v: T, i: Ref<number>) => U;

  if ('derive' in mapFn) {
    derivedMap = mapFn.derive;
  } else if (typeof mapFn === 'function') {
    derivedMap = () => mapFn;
  } else {
    derivedMap = () => mapFn.value;
  }

  return computed(() => {
    const newItems = derivedList() || [];
    let i: number;
    let j: number;

    const currentMap = derivedMap();

    function mapper() {
      let result: U | undefined;
      disposers[j] = batchCleanup(() => {
        const index = ref(j);
        indexes[j] = index;
        result = currentMap(newItems[j], index);
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
        for (j = 0; j < newLen; j += 1) {
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
          start += 1
        );

        // common suffix
        for (
          end = len - 1, newEnd = newLen - 1;
          end >= start && newEnd >= start && items[end] === newItems[newEnd];
          end -= 1, newEnd -= 1
        ) {
          temp[newEnd] = mapped[end];
          tempdisposers[newEnd] = disposers[end];
          tempIndexes[newEnd] = indexes[end];
        }

        // 0) prepare a map of all indices in newItems,
        // scanning backwards so we encounter them in natural order
        newIndices = new Map<T, number>();
        newIndicesNext = new Array<number>(newEnd + 1);
        for (j = newEnd; j >= start; j -= 1) {
          item = newItems[j];
          i = newIndices.get(item)!;
          newIndicesNext[j] = i === undefined ? -1 : i;
          newIndices.set(item, j);
        }
        // 1) step through all old items and see if they can be found
        // in the new set; if so, save them in a temp array and
        // mark them moved; if not, exit them
        for (i = start; i <= end; i += 1) {
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
        for (j = start; j < newLen; j += 1) {
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
  });
}
