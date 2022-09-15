import {
  captured,
  captureReactiveAtomForCleanup,
  createReactiveAtom,
  notifyReactiveAtom,
  onCleanup,
  syncEffect,
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

export function debouncedRef<T>(
  source: () => T,
  timeoutMS: number,
  isEqual: (next: T, prev: T) => boolean = is,
): Ref<T> {
  const instance = createReactiveAtom();
  captureReactiveAtomForCleanup(instance);

  let value: T;

  const setup = captured(() => {
    syncEffect(
      watch(source, (next) => {
        const timeout = setTimeout(() => {
          value = next;
          notifyReactiveAtom(instance);
        }, timeoutMS);

        onCleanup(() => {
          clearTimeout(timeout);
        });
      }, isEqual),
    );
  });

  let doSetup = true;

  const node: Ref<T> & WithRef & WithTrackable = readonly({
    [REF]: true,
    [TRACKABLE]: instance,
    get value(): T {
      if (doSetup) {
        value = untrack(source);
        setup();
        doSetup = false;
      }
      if (TRACKING) {
        trackReactiveAtom(instance);
      }
      return value;
    },
  });

  return node;
}

export function debounced<T>(
  source: () => T,
  timeoutMS: number,
  isEqual: (next: T, prev: T) => boolean = is,
): () => T {
  const instance = createReactiveAtom();
  captureReactiveAtomForCleanup(instance);

  let value: T;

  const setup = captured(() => {
    syncEffect(
      watch(source, (next) => {
        const timeout = setTimeout(() => {
          value = next;
          notifyReactiveAtom(instance);
        }, timeoutMS);

        onCleanup(() => {
          clearTimeout(timeout);
        });
      }, isEqual),
    );
  });

  let doSetup = true;

  return () => {
    if (doSetup) {
      value = untrack(source);
      setup();
      doSetup = false;
    }
    if (TRACKING) {
      trackReactiveAtom(instance);
    }
    return value;
  };
}
