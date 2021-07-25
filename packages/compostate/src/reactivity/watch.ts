/* eslint-disable @typescript-eslint/ban-types */
import { getTrackableAtom } from './nodes/track-map';
import { Ref } from './ref';
import untrack from './untrack';

function watch<T>(
  source: Ref<T>,
  listen: () => void,
): () => void;
function watch<T extends any[]>(
  source: T,
  listen: () => void,
): () => void;
function watch<T extends Record<string | symbol, any>>(
  source: T
  , listen: () => void,
): () => void;
function watch<V>(
  source: Set<V>,
  listen: () => void,
): () => void;
function watch<K, V>(
  source: Map<K, V>,
  listen: () => void,
): () => void;
function watch<V extends object>(
  source: WeakSet<V>,
  listen: () => void,
): () => void;
function watch<K extends object, V>(
  source: WeakMap<K, V>,
  listen: () => void,
): () => void;
function watch<T>(
  source: Ref<T>,
  listen: () => void,
): () => void;
function watch(source: any, listen: () => void, run = false): () => void {
  const atom = getTrackableAtom(source);
  if (atom) {
    if (run) {
      untrack(listen);
    }
    return atom.subscribe(listen);
  }
  throw new Error('Invalid trackable for `watch`. Received value is not a reactive value.');
}

export default watch;
