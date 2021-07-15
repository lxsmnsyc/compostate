import { Resource } from 'compostate';
import Context from './context';
import { MOUNT } from './lifecycle';

type SuspenseCapture = <T>(resource: Resource<T>) => void;

export const SUSPENSE = new Context<SuspenseCapture | undefined>();

export function suspend<T>(resource: Resource<T>): void {
  const mounting = MOUNT.getContext();

  if (!mounting) {
    throw new Error('Illegal suspend');
  }

  const suspenseCapture = SUSPENSE.getContext();

  if (suspenseCapture) {
    suspenseCapture(resource);
  }
}
