import ReactiveAtom from './reactive-atom';

const TRACK_MAP = new WeakMap<any, ReactiveAtom>();

export function registerTrackable<T>(
  atom: ReactiveAtom,
  trackable: T,
): void {
  TRACK_MAP.set(trackable, atom);
}

export function isTrackable<T>(
  trackable: T,
): boolean {
  return TRACK_MAP.has(trackable);
}

export function getTrackableAtom<T>(
  trackable: T,
): ReactiveAtom | undefined {
  return TRACK_MAP.get(trackable);
}
