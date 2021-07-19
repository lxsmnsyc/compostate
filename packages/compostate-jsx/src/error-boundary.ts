import { onError } from 'compostate';

export type ErrorCapture = (error: Error) => void;

export default class ErrorBoundary {
  private collection = new Set<ErrorCapture>();

  private parent?: ErrorBoundary;

  constructor(parent?: ErrorBoundary) {
    this.parent = parent;
  }

  register(callback: ErrorCapture): () => void {
    this.collection.add(callback);
    return () => {
      this.collection.delete(callback);
    };
  }

  capture(error: Error): void {
    if (this.collection.size) {
      try {
        new Set(this.collection).forEach((capture) => {
          capture(error);
        });
      } catch (newError) {
        if (this.parent) {
          this.parent.capture(error);
          this.parent.capture(newError);
        } else {
          throw newError;
        }
      }
    } else if (this.parent) {
      this.parent.capture(error);
    } else {
      throw error;
    }
  }
}

export function handleError(boundary: ErrorBoundary | undefined, error: Error): void {
  if (boundary) {
    boundary.capture(error);
  } else {
    throw error;
  }
}

export function setupErrorBoundary(boundary?: ErrorBoundary): void {
  onError((error) => {
    handleError(boundary, error);
  });
}
