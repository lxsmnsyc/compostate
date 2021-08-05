/* eslint-disable @typescript-eslint/ban-types */
import { untrack } from './create-root';
import { getTrackableAtom } from './nodes/track-map';
import onCleanup from './on-cleanup';
import { Ref } from './ref';

function watch<T>(
  source: Ref<T>,
  listen: () => void,
  run?: boolean,
): () => void;
function watch<T extends any[]>(
  source: T,
  listen: () => void,
  run?: boolean,
): () => void;
function watch<T extends Record<string | symbol, any>>(
  source: T,
  listen: () => void,
  run?: boolean,
): () => void;
function watch<V>(
  source: Set<V>,
  listen: () => void,
  run?: boolean,
): () => void;
function watch<K, V>(
  source: Map<K, V>,
  listen: () => void,
  run?: boolean,
): () => void;
function watch<V extends object>(
  source: WeakSet<V>,
  listen: () => void,
  run?: boolean,
): () => void;
function watch<K extends object, V>(
  source: WeakMap<K, V>,
  listen: () => void,
  run?: boolean,
): () => void;
function watch<T>(
  source: Ref<T>,
  listen: () => void,
  run?: boolean,
): () => void;
function watch(source: any, listen: () => void, run = false): () => void {
  const atom = getTrackableAtom(source);
  if (atom) {
    if (run) {
      untrack(listen);
    }
    const cleanup = atom.subscribe(listen);
    onCleanup(cleanup);
    return cleanup;
  }
  throw new Error('Invalid trackable for `watch`. Received value is not a reactive value.');
}

export default watch;
