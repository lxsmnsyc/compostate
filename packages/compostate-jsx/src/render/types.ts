import { EffectCleanup, Ref } from 'compostate';
import { VNode, ShallowReactive } from '..';
import { Marker } from '../dom';
import ErrorBoundary from '../error-boundary';
import { ProviderData } from '../provider';
import { SuspenseData } from '../suspense';

export interface Boundary {
  error?: ErrorBoundary;
  suspense?: SuspenseData;
  provider?: ProviderData;
}

export type RenderChildren = (
  boundary: Boundary,
  root: HTMLElement,
  children: VNode,
  marker?: Lazy<Marker | null>,
  suspended?: Ref<boolean | undefined> | boolean | undefined,
) => EffectCleanup;

export type Lazy<T> = T | (() => T);
