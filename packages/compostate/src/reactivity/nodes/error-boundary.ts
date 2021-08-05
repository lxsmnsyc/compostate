import { ErrorCapture } from '../types';

export let ERROR_BOUNDARY: ErrorBoundary | undefined;

export function setErrorBoundary(instance: ErrorBoundary | undefined): void {
  ERROR_BOUNDARY = instance;
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
    try {
      new Set(this.calls).forEach((handle) => {
        handle(error);
      });
    } catch (newError) {
      if (this.parent) {
        this.parent.handleError(error);
        this.parent.handleError(newError);
      } else {
        throw newError;
      }
    }
  }
}
