import {
  ReactiveAtom,
  TRACKING,
  trackReactiveAtom,
} from './core';

export const TRACKABLE = Symbol('COMPOSTATE_TRACKABLE');

export type WithTrackable = {
  [TRACKABLE]: ReactiveAtom | undefined;
};

export function registerTrackable<T>(
  instance: ReactiveAtom,
  trackable: T,
): T {
  (trackable as unknown as WithTrackable)[TRACKABLE] = instance;
  return trackable;
}

export function isTrackable<T>(
  trackable: T,
): boolean {
  return trackable && typeof trackable === 'object' && TRACKABLE in trackable;
}

export function getTrackableAtom<T>(
  trackable: T,
): ReactiveAtom | undefined {
  return (trackable as unknown as WithTrackable)[TRACKABLE];
}

export function track<T>(source: T): T {
  if (TRACKING) {
    const instance = getTrackableAtom(source);
    if (instance) {
      trackReactiveAtom(instance);
    }
  }
  return source;
}
