import { Cleanup, ErrorCapture } from '../types';

export interface ErrorBoundary {
  calls?: Set<ErrorCapture>;
  parent?: ErrorBoundary;
}

export let ERROR_BOUNDARY: ErrorBoundary | undefined;

export function setErrorBoundary(instance: ErrorBoundary | undefined): void {
  ERROR_BOUNDARY = instance;
}

export function createErrorBoundary(parent?: ErrorBoundary): ErrorBoundary {
  return { parent };
}

export function handleError(instance: ErrorBoundary | undefined, error: Error): void {
  if (instance) {
    if (instance.calls?.size) {
      try {
        new Set(instance.calls).forEach((handle) => {
          handle(error);
        });
      } catch (newError) {
        handleError(instance.parent, error);
        handleError(instance.parent, newError);
      }
    } else {
      handleError(instance.parent, error);
    }
  } else {
    throw error;
  }
}

export function registerErrorCapture(
  instance: ErrorBoundary,
  capture: ErrorCapture,
): Cleanup {
  if (!instance.calls) {
    instance.calls = new Set();
  }
  instance.calls.add(capture);
  return () => {
    instance.calls?.delete(capture);
  };
}
