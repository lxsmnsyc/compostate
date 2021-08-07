import { Ref, Resource } from 'compostate';

export type SuspenseCapture = <T>(resource: Resource<T>) => void;

export interface SuspenseData {
  capture?: SuspenseCapture;
  suspend: boolean | Ref<boolean> | (() => boolean);
}

export let SUSPENSE: SuspenseData | undefined;

export function setSuspense(instance: SuspenseData | undefined): void {
  SUSPENSE = instance;
}

export function suspend<T>(resource: Resource<T>): void {
  if (SUSPENSE?.capture) {
    SUSPENSE.capture(resource);
  }
}
