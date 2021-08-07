/* eslint-disable @typescript-eslint/ban-types */
import { getTrackableAtom } from './nodes/track-map';

function track<T>(source: T): T {
  const atom = getTrackableAtom(source);
  if (atom) {
    atom.track();
  }
  return source;
}

export default track;
