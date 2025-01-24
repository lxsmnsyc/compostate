import { onCleanup } from './cleanup-boundary';
import { NO_OP } from './constants';
import {
  getCurrentErrorBoundary,
  popErrorBoundary,
  popTracker,
  pushErrorBoundary,
  pushTracker,
} from './owner';
import { ResourceNotReadyError } from './suspense';
import type { Cleanup, ErrorBoundary, ErrorHandler } from './types';

export function handleError(
  instance: ErrorBoundary | undefined,
  error: unknown,
): void {
  if (!instance) {
    throw error;
  }
  // Check if the current boundary has listeners
  if (instance.handlers && instance.handlers.size) {
    // Untrack before passing error
    const parentObserver = pushTracker(undefined);
    try {
      for (const handler of instance.handlers) {
        handler(error);
      }
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
  } else {
    // Forward the error to the parent
    handleError(instance.parent, error);
  }
}

function addErrorHandler(instance: ErrorBoundary, handler: ErrorHandler): void {
  if (!instance.handlers) {
    instance.handlers = new Set();
  }
  instance.handlers.add(handler);
}

function removeErrorHandler(this: ErrorBoundary, handler: ErrorHandler): void {
  if (this.handlers) {
    this.handlers.delete(handler);
  }
}

export function onError(handler: ErrorHandler): Cleanup {
  const current = getCurrentErrorBoundary();
  if (current) {
    addErrorHandler(current, handler);
    return onCleanup(removeErrorHandler.bind(current, handler));
  }
  return NO_OP;
}

export function errorBoundary<T>(callback: () => T): T {
  const parent = pushErrorBoundary({
    parent: getCurrentErrorBoundary(),
    handlers: undefined,
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
