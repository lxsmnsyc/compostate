import {
  captured,
} from 'compostate';

import { setSuspense, SUSPENSE, SuspenseData } from './suspense';

const DERIVED = Symbol('COMPOSTATE_DERIVED');

export type Derived<T> = {
  suspense?: SuspenseData;
} & Record<typeof DERIVED, () => T>;

export function isDerived<T>(value: any): value is Derived<T> {
  return DERIVED in value;
}

export function evalDerived<T>(value: Derived<T>): T {
  // Capture currently running context
  const parentSuspense = SUSPENSE;
  // Repush captured contexts
  setSuspense(value.suspense);
  try {
    return value[DERIVED]();
  } finally {
    setSuspense(parentSuspense);
  }
}

export function derived<T>(value: () => T): Derived<T> {
  return {
    [DERIVED]: captured(value),
    suspense: SUSPENSE,
  };
}
