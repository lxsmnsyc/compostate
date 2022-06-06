import { ReactiveBaseObject } from './types';

export const READONLY = Symbol('COMPOSTATE_READONLY');

export type WithReadonly = {
  [READONLY]: boolean;
};

export function isReadonly<T extends ReactiveBaseObject>(object: T): object is Readonly<T> {
  return object && typeof object === 'object' && READONLY in object;
}

const HANDLER = {
  set() {
    return true;
  },
};

export function readonly<T extends ReactiveBaseObject>(object: T): T {
  if (isReadonly(object)) {
    return object;
  }
  const newReadonly = new Proxy(object, HANDLER);
  (newReadonly as WithReadonly)[READONLY] = true;
  return newReadonly;
}
