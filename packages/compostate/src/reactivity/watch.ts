/* eslint-disable @typescript-eslint/ban-types */
import { createRoot } from './create-root';
import { subscribeReactiveAtom } from './nodes/reactive-atom';
import { getTrackableAtom } from './nodes/track-map';
import onCleanup from './on-cleanup';

function watch<T>(source: T, listen: () => void, run = false): () => void {
  const atom = getTrackableAtom(source);
  if (atom) {
    const wrappedListener = () => createRoot(listen);
    if (run) {
      wrappedListener();
    }
    const cleanup = subscribeReactiveAtom(atom, wrappedListener);
    onCleanup(cleanup);
    return cleanup;
  }
  throw new Error('Invalid trackable for `watch`. Received value is not a reactive value.');
}

export default watch;
