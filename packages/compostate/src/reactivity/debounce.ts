import {
  onCleanup,
  ref,
  signal,
  untrack,
  watch,
} from './core';
import { Ref } from './types';

export function debounce<T>(
  computation: () => T,
  timeoutMS: number,
): Ref<T> {
  const state = ref(untrack(computation));

  watch(computation, (next) => {
    const timeout = setTimeout(() => {
      state.value = next;
    }, timeoutMS);

    onCleanup(() => {
      clearTimeout(timeout);
    });
  });

  return state;
}

export function debouncedAtom<T>(
  computation: () => T,
  timeoutMS: number,
): () => T {
  const [read, write] = signal(untrack(computation));

  watch(computation, (next) => {
    const timeout = setTimeout(() => {
      write(next);
    }, timeoutMS);

    onCleanup(() => {
      clearTimeout(timeout);
    });
  });

  return read;
}
