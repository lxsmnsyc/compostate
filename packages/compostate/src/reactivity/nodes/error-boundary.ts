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

  forwardError(error: Error): void {
    if (this.parent) {
      this.parent.handleError(error);
    } else {
      throw error;
    }
  }

  handleError(error: Error): void {
    if (this.calls?.size) {
      try {
        new Set(this.calls).forEach((handle) => {
          handle(error);
        });
      } catch (newError) {
        this.forwardError(error);
        this.forwardError(newError);
      }
    } else {
      this.forwardError(error);
    }
  }
}
