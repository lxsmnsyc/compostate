import { Ref } from 'compostate';

export type InternalShallowReactive<T> =
  T | Ref<T> | Lazy<T>;

export type Lazy<T> = T | (() => T);
