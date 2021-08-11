import { computed } from './core';
import { ReactiveObject, Ref } from './types';

export type Spread<T extends ReactiveObject> = {
  [key in keyof T]: Readonly<Ref<T[key]>>;
}

export type KeyType<T extends ReactiveObject> =
   T extends any[]
    ? number
    : keyof T;

export function destructure<T extends ReactiveObject>(
  source: T,
): Spread<T> {
  const proxy = new Proxy((Array.isArray(source) ? [] : {}) as Spread<T>, {
    get(target, key) {
      const ref = Reflect.get(target, key);
      if (ref) {
        return ref;
      }
      const newRef = computed(() => source[key as keyof T]);
      Reflect.set(target, key, newRef);
      return newRef;
    },
  });

  return proxy;
}

export function spread<T extends ReactiveObject>(
  source: T,
): Spread<T> {
  const proxy = (Array.isArray(source) ? [] : {}) as Spread<T>;

  for (const key of Object.keys(source)) {
    const k = key as keyof Spread<T>;
    proxy[k] = computed(() => source[k]);
  }

  return proxy;
}
