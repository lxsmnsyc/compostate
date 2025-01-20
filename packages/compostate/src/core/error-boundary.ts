import { onCleanup } from './cleanup-boundary';
import { NO_OP } from './constants';
import {
  getCurrentErrorBoundary,
  popErrorBoundary,
  popObserver,
  pushErrorBoundary,
  pushObserver,
} from './owner';
import type { Cleanup, ErrorBoundary, ErrorHandler } from './types';

export function handleError(
  instance: ErrorBoundary | undefined,
  error: unknown,
): void {
  if (instance) {
    // Check if the current boundary has listeners
    if (instance.handlers && instance.handlers.size) {
      // Untrack before passing error
      const parentObserver = pushObserver(undefined);
      try {
        for (const handler of instance.handlers) {
          handler(error);
        }
      } catch (value) {
        // If the error handler fails, forward the new error and the current error
        handleError(instance.parent, value);
        handleError(instance.parent, error);
      } finally {
        popObserver(parentObserver);
      }
    } else {
      // Forward the error to the parent
      handleError(instance.parent, error);
    }
  } else {
    throw error;
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
