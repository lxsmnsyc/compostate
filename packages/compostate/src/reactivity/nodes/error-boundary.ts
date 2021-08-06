import { ErrorCapture } from '../types';

export let ERROR_BOUNDARY: ErrorBoundary | undefined;

export function setErrorBoundary(instance: ErrorBoundary | undefined): void {
  ERROR_BOUNDARY = instance;
}

export function handleError(instance: ErrorBoundary | undefined, error: Error): void {
  if (instance) {
    instance.handleError(error);
  } else {
    throw error;
  }
}

export default class ErrorBoundary {
  private calls?: Set<ErrorCapture>;

  private parent?: ErrorBoundary;

  constructor(parent?: ErrorBoundary) {
    this.parent = parent;
  }

  register(cleanup: ErrorCapture): () => void {
    if (!this.calls) {
      this.calls = new Set();
    }
    this.calls.add(cleanup);
    return () => {
      this.calls?.delete(cleanup);
    };
  }

  handleError(error: Error): void {
    if (this.calls?.size) {
      try {
        new Set(this.calls).forEach((handle) => {
          handle(error);
        });
      } catch (newError) {
        handleError(this.parent, error);
        handleError(this.parent, newError);
      }
    } else {
      handleError(this.parent, error);
    }
  }
}
