import type { Atom } from '../core';
import { atom, batch, unbatchCleanup, untrack } from '../core';

/**
 * A plain object whose property reads are tracked per key. Bindings for
 * component frameworks use it to turn an immutable props object into something
 * a compostate computation can subscribe to.
 */
export interface ReactiveProps<P extends Record<string, any>> {
  props: P;
  set<K extends keyof P & string>(key: K, value: P[K]): void;
  replace(next: P): void;
}

function isSameKeys(prev: string[], next: string[]): boolean {
  if (prev.length !== next.length) {
    return false;
  }
  for (let i = 0, len = prev.length; i < len; i++) {
    if (prev[i] !== next[i]) {
      return false;
    }
  }
  return true;
}

export function createReactiveProps<P extends Record<string, any>>(
  initial: P,
): ReactiveProps<P> {
  const atoms = new Map<string, Atom<unknown>>();
  // Atoms register their disposal on the enclosing cleanup boundary. Property
  // reads happen inside the render computation, so creating an atom lazily
  // there would destroy it on the very next revalidation. Detaching keeps the
  // atom alive for as long as the proxy is reachable.
  const keys = unbatchCleanup(() => atom(Object.keys(initial)));

  function getAtom(key: string): Atom<unknown> {
    let instance = atoms.get(key);
    if (!instance) {
      instance = unbatchCleanup(() => atom<unknown>(initial[key]));
      atoms.set(key, instance);
    }
    return instance;
  }

  for (const key of Object.keys(initial)) {
    getAtom(key);
  }

  const props = new Proxy({} as P, {
    get(_target, key) {
      return typeof key === 'string' ? getAtom(key)() : undefined;
    },
    has(_target, key) {
      return typeof key === 'string' && keys().includes(key);
    },
    ownKeys() {
      return keys();
    },
    getOwnPropertyDescriptor(_target, key) {
      if (typeof key === 'string' && keys().includes(key)) {
        return {
          configurable: true,
          enumerable: true,
          value: getAtom(key)(),
          writable: false,
        };
      }
      return undefined;
    },
    set() {
      return false;
    },
    deleteProperty() {
      return false;
    },
  });

  function set<K extends keyof P & string>(key: K, value: P[K]): void {
    batch(() => {
      getAtom(key)(value);
      const prevKeys = untrack(keys);
      if (!prevKeys.includes(key)) {
        keys([...prevKeys, key]);
      }
    });
  }

  function replace(next: P): void {
    batch(() => {
      const nextKeys = Object.keys(next);
      for (const key of nextKeys) {
        getAtom(key)(next[key]);
      }
      for (const [key, instance] of atoms) {
        if (!(key in next)) {
          instance(undefined);
        }
      }
      if (!isSameKeys(untrack(keys), nextKeys)) {
        keys(nextKeys);
      }
    });
  }

  return { props, set, replace };
}
