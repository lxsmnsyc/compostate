import {
  captureReactiveAtomForCleanup,
  createReactiveAtom,
  notifyReactiveAtom,
  onCleanup,
  TRACKING,
  trackReactiveAtom,
  untrack,
  watch,
} from './core';
import { readonly } from './readonly';
import { REF, WithRef } from './refs';
import { WithTrackable, TRACKABLE } from './trackable';
import { Ref } from './types';

const { is } = Object;

export function debounce<T>(
  computation: () => T,
  timeoutMS: number,
  isEqual: (next: T, prev: T) => boolean = is,
): Ref<T> {
  const instance = createReactiveAtom();
  captureReactiveAtomForCleanup(instance);

  let value = untrack(computation);

  watch(computation, (next) => {
    const timeout = setTimeout(() => {
      value = next;
      notifyReactiveAtom(instance);
    }, timeoutMS);

    onCleanup(() => {
      clearTimeout(timeout);
    });
  }, isEqual);

  const node: Ref<T> & WithRef & WithTrackable = readonly({
    [REF]: true,
    [TRACKABLE]: instance,
    get value(): T {
      if (TRACKING) {
        trackReactiveAtom(instance);
      }
      return value;
    },
  });

  return node;
}

export function debouncedAtom<T>(
  computation: () => T,
  timeoutMS: number,
  isEqual: (next: T, prev: T) => boolean = is,
): () => T {
  const instance = createReactiveAtom();
  captureReactiveAtomForCleanup(instance);

  let value = untrack(computation);

  watch(computation, (next) => {
    const timeout = setTimeout(() => {
      value = next;
      notifyReactiveAtom(instance);
    }, timeoutMS);

    onCleanup(() => {
      clearTimeout(timeout);
    });
  }, isEqual);

  return () => value;
}
