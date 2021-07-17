/* eslint-disable no-param-reassign */
import effect from './effect';
import reactive from './reactive';
import ref, { Ref } from './ref';
import track from './track';
import untrack from './untrack';

export function patch<T>(
  source: T[],
  change: T[],
): void {
  effect(() => {
    for (let i = 0; i < patch.length; i += 1) {
      source[i] = change[i];
    }
    for (let i = change.length; i < source.length; i += 1) {
      untrack(() => {
        delete source[i];
      });
    }
  });
}

export function mapByIndex<T, R>(
  array: T[],
  mapper: (value: T, index: Ref<number>) => R,
): R[] {
  const newArray = reactive<R[]>([]);
  const itemMap = new Map<T, Ref<number>>();

  const clean = untrack(() => (
    effect(() => {
      const trackedArray = track(array);

      itemMap.forEach((_, item) => {
        if (untrack(() => !trackedArray.includes(item))) {
          itemMap.delete(item);
        }
      });

      const change: R[] = [];

      for (let i = 0; i < trackedArray.length; i += 1) {
        const item = untrack(() => trackedArray[i]);
        const current = itemMap.get(item);

        if (current) {
          change[i] = untrack(() => newArray[current.value]);
          current.value = i;
        } else {
          const newRef = ref(i);
          itemMap.set(item, newRef);
          change[i] = untrack(() => mapper(item, newRef));
        }
      }

      patch(newArray, change);
    })
  ));

  effect(() => () => {
    clean();
    itemMap.clear();
  });

  return newArray;
}

export function mapByValue<T, R>(
  array: T[],
  mapper: (value: Ref<T>, index: number) => R,
): R[] {
  const newArray = reactive<R[]>([]);
  const itemMap: Ref<T>[] = [];

  const clean = untrack(() => (
    effect(() => {
      const trackedArray = track(array);

      const change: R[] = [];

      for (let i = 0; i < trackedArray.length; i += 1) {
        const item = untrack(() => trackedArray[i]);
        const current = itemMap[i];

        if (current) {
          change[i] = untrack(() => newArray[i]);
          current.value = item;
        } else {
          const newRef = ref(item);
          itemMap[i] = newRef;
          change[i] = untrack(() => mapper(newRef, i));
        }
      }
      patch(newArray, change);
    })
  ));

  effect(() => () => {
    clean();
  });

  return newArray;
}
