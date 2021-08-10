import { computed, effect } from './core';
import readonly from './readonly';
import ref from './ref';
import { Ref } from './types';

export default function debounce<T>(
  computation: () => T,
  timeoutMS: number,
): Readonly<Ref<T>> {
  const current = computed(computation);

  const state = ref(current.value);

  effect(() => {
    const currentValue = current.value;

    const timeout = setTimeout(() => {
      state.value = currentValue;
    }, timeoutMS);

    return () => {
      clearTimeout(timeout);
    };
  });

  return readonly(state);
}
