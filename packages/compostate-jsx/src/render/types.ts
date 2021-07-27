import { Ref } from 'compostate';
import ErrorBoundary from '../error-boundary';
import { ProviderData } from '../provider';
import { SuspenseData } from '../suspense';

export interface Boundary {
  error?: ErrorBoundary;
  suspense?: SuspenseData;
  provider?: ProviderData;
}

export type InternalShallowReactive<T> =
  T | Ref<T> | Lazy<T>;

export type Lazy<T> = T | (() => T);
