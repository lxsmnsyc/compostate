import { EffectCleanup, Ref } from 'compostate';

export interface Renderable {
  render: (root: HTMLElement, marker?: Node | null) => EffectCleanup;
}

export type VText = string | number;
export type VNull = boolean | null | undefined;
export type VChild = Renderable | VText;
export type VNode = VChild | VNull | VNode[] | Ref<VNode>;

export interface Attributes {
  // empty
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

export type ReactiveProperty<K, V> =
  K extends 'ref'
    ? V
    :
  K extends 'children'
    ? V
    :
  V extends Ref<infer T>
    ? Ref<Ref<T>>
    : V | Ref<V>;

export type Reactive<P> =
  P extends BaseProps<any>
    ? { [K in keyof P]: ReactiveProperty<K, P[K]> }
    :
  P extends Array<infer U>
    ? Array<U | Ref<U>>
    :
  P extends Ref<infer T>
    ? Ref<Ref<T>>
    : P | Ref<P>;

export interface VComponent<P> {
  (props: P): VNode;
  $props?: Reactive<P>;
}
