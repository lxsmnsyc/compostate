import { Ref } from 'compostate';

export type VText = string | number;
export type VNull = boolean | null | undefined;
export type VChild = Node | VText;
export type VNode =
  | VChild
  | VNull
  | VNode[]
  | (() => VNode);

export interface Attributes {
  // no-op
}

export interface RefAttributes<T> extends Attributes {
  ref?: Ref<T> | undefined;
}

export interface WithChildren extends Attributes {
  children?: VNode[] | undefined;
}

export interface BaseProps<T> extends RefAttributes<T>, WithChildren {
  [key: string]: any;
}

export type ShallowReactive<V> =
  V extends Ref<infer T>
    ? () => () => T
    : V | (() => V);

export type ReactiveProperty<K, V> =
  K extends 'ref'
    ? V
    :
  K extends 'children'
    ? V
    : ShallowReactive<V>;

export type Reactive<P> =
  P extends Record<string, any>
    ? { [K in keyof P]: ReactiveProperty<K, P[K]> }
    :
  P extends Array<infer U>
    ? Array<U | (() => U)>
    : ShallowReactive<P>;

export interface VComponent<P> {
  (props: P): VNode;
  props?: Reactive<P>;
}

export type VConstructor<P extends Record<string, any> = Record<string, any>> =
  | string
  | VComponent<P>;
