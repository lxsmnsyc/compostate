import { capturedBatchCleanup, capturedErrorBoundary, captureError } from 'compostate';
import { PROVIDER, setProvider } from './provider';
import { setSuspense, SUSPENSE } from './suspense';

export interface Derived<T> {
  derive: () => T;
}

export function derived<T>(value: () => T): Derived<T> {
  // Capture current contexts
  const currentSuspense = SUSPENSE;
  const currentProvider = PROVIDER;
  return {
    derive: () => {
      // Capture currently running context
      const parentSuspense = SUSPENSE;
      const parentProvider = PROVIDER;
      // Repush captured contexts
      setSuspense(currentSuspense);
      setProvider(currentProvider);
      try {
        return capturedBatchCleanup(capturedErrorBoundary(value))();
      } finally {
        setProvider(parentProvider);
        setSuspense(parentSuspense);
      }
    },
    capture: captureError(),
  };
}
