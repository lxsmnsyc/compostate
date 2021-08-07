import { capturedErrorBoundary } from 'compostate';
import { PROVIDER, setProvider } from './provider';
import { setSuspense, SUSPENSE } from './suspense';

export interface Derived<T> {
  derive: () => T;
}

export function derived<T>(value: () => T): Derived<T> {
  // Internal contexts
  const currentSuspense = SUSPENSE;
  const currentProvider = PROVIDER;
  return {
    derive: () => {
      const parentSuspense = SUSPENSE;
      const parentProvider = PROVIDER;
      setSuspense(currentSuspense);
      setProvider(currentProvider);
      try {
        return capturedErrorBoundary(value)();
      } finally {
        setProvider(parentProvider);
        setSuspense(parentSuspense);
      }
    },
  };
}
