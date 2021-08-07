import { CLEANUP, setCleanup } from './nodes/cleanup';
import { ERROR_BOUNDARY, setErrorBoundary } from './nodes/error-boundary';

export function capturedBatchCleanup<T extends any[], R>(
  callback: (...args: T) => R,
): (...args: T) => R {
  const current = CLEANUP;
  return (...args) => {
    const parent = CLEANUP;
    setCleanup(current);
    try {
      return callback(...args);
    } finally {
      setCleanup(parent);
    }
  };
}

export function capturedErrorBoundary<T extends any[], R>(
  callback: (...args: T) => R,
): (...args: T) => R {
  const current = ERROR_BOUNDARY;
  return (...args) => {
    const parent = ERROR_BOUNDARY;
    setErrorBoundary(current);
    try {
      return callback(...args);
    } finally {
      setErrorBoundary(parent);
    }
  };
}
