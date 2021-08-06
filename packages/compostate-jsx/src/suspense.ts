import { Ref, Resource } from 'compostate';
import Context from './context';
import { MOUNT } from './lifecycle';

export type SuspenseCapture = <T>(resource: Resource<T>) => void;

export interface SuspenseData {
  capture?: SuspenseCapture;
  suspend: boolean | Ref<boolean> | (() => boolean);
}

export const SUSPENSE = new Context<SuspenseData | undefined>();

export function suspend<T>(resource: Resource<T>): void {
  const mounting = MOUNT.current();

  if (!mounting) {
    throw new Error('Illegal suspend');
  }

  const suspense = SUSPENSE.current();

  if (suspense?.capture) {
    suspense.capture(resource);
  }
}
