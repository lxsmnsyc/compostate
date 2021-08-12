import {
  captured,
} from 'compostate';

import { setSuspense, SUSPENSE } from './suspense';
import { Derived } from './types';

export function evalDerived<T>(value: Derived<T>): T {
  // Capture currently running context
  const parentSuspense = SUSPENSE;
  // Repush captured contexts
  setSuspense(value.suspense);
  try {
    return value.derive();
  } finally {
    setSuspense(parentSuspense);
  }
}

export function derived<T>(value: () => T): Derived<T> {
  return {
    derive: captured(value),
    suspense: SUSPENSE,
  };
}
