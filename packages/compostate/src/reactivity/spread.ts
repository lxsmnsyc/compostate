import computed from './computed';
import { Ref } from './ref';
import { ReactiveObject } from './types';

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
): T {
  const cache = new Map<string | number | symbol, Ref<T[keyof T]>>();

  const proxy = new Proxy(source, {
    get(target, key, receiver) {
      const ref = cache.get(key);
      if (ref) {
        return ref;
      }
      return computed(() => Reflect.get(target, key, receiver));
    },
  });

  return proxy;
}