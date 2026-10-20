import {
  getCurrentErrorBoundary,
  popErrorBoundary,
  popTracker,
  pushErrorBoundary,
  pushTracker,
} from './owner';
import { ResourceNotReadyError } from './suspense';
import type { ErrorBoundary, ErrorHandler } from './types';

export function handleError(
  instance: ErrorBoundary | undefined,
  error: unknown,
): void {
  if (!instance) {
    throw error;
  }
  // Untrack before passing error
  const parentObserver = pushTracker(undefined);
  try {
    instance.handler(error);
  } catch (value) {
    if (value instanceof ResourceNotReadyError) {
      throw value;
    }
    // If the error handler fails, forward the new error and the current error
    handleError(instance.parent, value);
    handleError(instance.parent, error);
  } finally {
    popTracker(parentObserver);
  }
}

export function errorBoundary<T>(callback: () => T, handler: ErrorHandler): T {
  const parent = pushErrorBoundary({
    parent: getCurrentErrorBoundary(),
    handler,
  });
  try {
    return callback();
  } finally {
    popErrorBoundary(parent);
  }
}

export function captureError(): ErrorHandler {
  const current = getCurrentErrorBoundary();
  return handleError.bind(null, current);
}
