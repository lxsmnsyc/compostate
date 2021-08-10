import { computed } from './core';
import { ReactiveObject, Ref } from './types';

export type Spread<T extends ReactiveObject> = {
  readonly [key in keyof T]: Readonly<Ref<T>>;
}

export type KeyType<T extends ReactiveObject> =
  T extends any[]
    ? number
    :
  T extends { [key: string]: any }
    ? keyof T
    : never;

export default function spread<T extends ReactiveObject>(
  source: T,
): Spread<T> {
  const proxy = new Proxy({} as Spread<T>, {
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
