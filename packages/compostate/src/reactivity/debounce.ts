import { atom, effect, untrack } from './core';

export default function debounce<T>(
  computation: () => T,
  timeoutMS: number,
): () => T {
  const state = atom(untrack(computation));

  effect(() => {
    const currentValue = computation();

    const timeout = setTimeout(() => {
      state(currentValue);
    }, timeoutMS);

    return () => {
      clearTimeout(timeout);
    };
  });

  return () => state();
}
