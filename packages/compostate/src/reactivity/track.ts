/* eslint-disable @typescript-eslint/ban-types */
import { trackReactiveAtom } from './nodes/reactive-atom';
import { getTrackableAtom } from './nodes/track-map';

function track<T>(source: T): T {
  const atom = getTrackableAtom(source);
  if (atom) {
    trackReactiveAtom(atom);
  }
  return source;
}

export default track;
