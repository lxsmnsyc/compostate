import {
  createReactiveAtom,
  watch,
  notifyReactiveAtom,
  TRACKING,
  trackReactiveAtom,
  ReactiveAtom,
  untrack,
  captureReactiveAtomForCleanup,
  syncEffect,
  captured,
  effect,
} from './core';
import {
  readonly,
} from './readonly';
import {
  TRACKABLE,
  WithTrackable,
} from './trackable';
import {
  Ref,
} from './types';

const { is } = Object;

export const REF = Symbol('COMPOSTATE_REF');

export type WithRef = {
  [REF]: boolean;
};

export function isRef<T>(object: any): object is Ref<T> {
  return object && typeof object === 'object' && REF in object;
}

export function computed<T>(
  compute: () => T,
  isEqual: (next: T, prev: T) => boolean = is,
): Readonly<Ref<T>> {
  const instance = createReactiveAtom();
  captureReactiveAtomForCleanup(instance);

  let value: T;
  let initial = true;
  let doSetup = true;

  const setup = captured(() => {
    syncEffect(
      watch(compute, (current) => {
        value = current;
        if (initial) {
          initial = false;
        } else {
          notifyReactiveAtom(instance);
        }
      }, isEqual),
    );
  });

  const node: Ref<T> & WithRef & WithTrackable = readonly({
    [REF]: true,
    [TRACKABLE]: instance,
    get value(): T {
      if (doSetup) {
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

class RefNode<T> implements WithRef {
  private val: T;

  private instance: ReactiveAtom;

  private isEqual: (next: T, prev: T) => boolean;

  [REF]: boolean;

  constructor(
    value: T,
    instance: ReactiveAtom,
    isEqual: (next: T, prev: T) => boolean,
  ) {
    this.val = value;
    this.instance = instance;
    this.isEqual = isEqual;
    this[REF] = true;
  }

  get value() {
    if (TRACKING) {
      trackReactiveAtom(this.instance);
    }
    return this.val;
  }

  set value(next: T) {
    if (!this.isEqual(next, this.val)) {
      this.val = next;
      notifyReactiveAtom(this.instance);
    }
  }
}

export function ref<T>(
  value: T,
  isEqual: (next: T, prev: T) => boolean = is,
): Ref<T> {
  const instance = createReactiveAtom();
  captureReactiveAtomForCleanup(instance);
  return new RefNode(value, instance, isEqual);
}

export function deferred<T>(
  callback: () => T,
  isEqual: (next: T, prev: T) => boolean = is,
): Readonly<Ref<T>> {
  const instance = createReactiveAtom();
  captureReactiveAtomForCleanup(instance);

  let value: T;

  const setup = captured(() => {
    effect(() => {
      const next = callback();
      if (!isEqual(value, next)) {
        value = next;
        notifyReactiveAtom(instance);
      }
    });
  });

  let doSetup = true;

  const node: Ref<T> & WithRef & WithTrackable = readonly({
    [REF]: true,
    [TRACKABLE]: instance,
    get value(): T {
      if (doSetup) {
        value = untrack(callback);
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
