import { computed } from './core';
import { ReactiveObject, Ref } from './types';

export type Spread<T extends ReactiveObject> = {
  readonly [key in keyof T]: Readonly<Ref<T[key]>>;
}

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
  if (Array.isArray(source)) {
    const proxy = [] as unknown as Spread<T>;
    for (let i = 0, len = source.length; i < len; i++) {
      proxy[i] = computed(() => source[i]);
    }
    return proxy;
  }

  const proxy = {} as Spread<T>;

  Object.keys(source).forEach((key) => {
    proxy[key] = computed(() => source[key]);
  });

  return proxy;
}
