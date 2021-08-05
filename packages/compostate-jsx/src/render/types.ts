import { Ref } from 'compostate';
import { VNode } from '../types';
import { Marker } from '../dom';
import { ProviderData } from '../provider';
import { SuspenseData } from '../suspense';

export interface Boundary {
  suspense?: SuspenseData;
  provider?: ProviderData;
}

export type InternalShallowReactive<T> =
  T | Ref<T> | Lazy<T>;

export type RenderChildren = (
  boundary: Boundary,
  root: HTMLElement,
  children: VNode,
  marker?: Lazy<Marker | null>,
  suspended?: InternalShallowReactive<boolean | undefined>,
) => void;

export type Lazy<T> = T | (() => T);
