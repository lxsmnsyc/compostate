import {
  batchCleanup,
  createRoot,
  onCleanup,
  ref,
  untrack,
} from './core';
import { Cleanup, Ref } from './types';

function dispose(d: Cleanup[]) {
  for (let i = 0, len = d.length; i < len; i++) d[i]();
}

// From https://github.com/solidjs/solid/blob/main/packages/solid/src/reactive/array.ts

interface Mapper<T, U> {
  (v: T): U;
  (v: T, i: Ref<number>): U;
}

export function map<T, U>(
  list: () => T[],
  mapFn: Mapper<T, U>,
): () => U[] {
  let items: T[] = [];
  let mapped: U[] = [];
  let disposers: (() => void)[] = [];
  let len = 0;
  let indexes: Ref<number>[] = [];

  onCleanup(() => dispose(disposers));

  return () => {
    const newItems = list();
    let i: number;
    let j: number;

    function mapper() {
      let result: U | undefined;
      disposers[j] = batchCleanup(() => {
        if (mapFn.length === 1) {
          result = mapFn(newItems[j]);
        } else {
          const key = ref(j);
          indexes[j] = key;
          result = mapFn(newItems[j], key);
        }
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
            tempIndexes[j] = indexes[i];
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
            const refIndex = tempIndexes[j];
            if (refIndex) {
              indexes[j] = refIndex;
              indexes[j].value = j;
            }
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

export function index<T, U>(
  list: () => T[],
  mapFn: (v: Ref<T>, i: number) => U,
): () => U[] {
  let items: T[] = [];
  let mapped: U[] = [];
  let disposers: (() => void)[] = [];
  let refs: Ref<T>[] = [];
  let len = 0;
  let i: number;

  onCleanup(() => dispose(disposers));
  return () => {
    const newItems = list();

    function mapper() {
      let result: U | undefined;
      disposers[i] = batchCleanup(() => {
        const item = ref(newItems[i]);
        refs[i] = item;
        result = mapFn(item, i);
      });
      return result as U;
    }

    return untrack(() => {
      if (newItems.length === 0) {
        if (len !== 0) {
          dispose(disposers);
          disposers = [];
          items = [];
          mapped = [];
          len = 0;
          refs = [];
        }
        return mapped;
      }

      for (i = 0; i < newItems.length; i++) {
        if (i < items.length && items[i] !== newItems[i]) {
          refs[i].value = newItems[i];
        } else if (i >= items.length) {
          mapped[i] = createRoot(mapper);
        }
      }
      for (; i < items.length; i++) {
        disposers[i]();
      }
      len = newItems.length;
      disposers.length = len;
      refs.length = len;
      items = newItems.slice(0);
      mapped = mapped.slice(0, len);
      return mapped;
    });
  };
}
