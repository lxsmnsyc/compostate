/* eslint-disable @typescript-eslint/ban-types */
import ReactiveMap from './reactive-map';
import ReactiveSet from './reactive-set';
import ReactiveWeakMap from './reactive-weak-map';
import ReactiveWeakSet from './reactive-weak-set';
import { getTrackableAtom } from './track-map';

function track<T extends any[]>(source: T): T;
function track<T extends Record<string | symbol, any>>(source: T): T;
function track<V>(source: Set<V>): ReactiveSet<V>;
function track<K, V>(source: Map<K, V>): ReactiveMap<K, V>;
function track<V extends object>(source: WeakSet<V>): ReactiveWeakSet<V>;
function track<K extends object, V>(source: WeakMap<K, V>): ReactiveWeakMap<K, V>;
function track(source: any): any {
  const atom = getTrackableAtom(source);
  if (atom) {
    atom.track();
  }
  return source;
}

export default track;
