/* eslint-disable @typescript-eslint/ban-types */
import { createRoot } from './create-root';
import { getTrackableAtom } from './nodes/track-map';
import onCleanup from './on-cleanup';

function watch<T>(source: T, listen: () => void, run = false): () => void {
  const atom = getTrackableAtom(source);
  if (atom) {
    if (run) {
      createRoot(listen);
    }
    const cleanup = atom.subscribe(listen);
    onCleanup(cleanup);
    return cleanup;
  }
  throw new Error('Invalid trackable for `watch`. Received value is not a reactive value.');
}

export default watch;
