import Context from '../../context';
import { ErrorCapture } from '../types';

export const ERROR_BOUNDARY = new Context<ErrorBoundary | undefined>();

export default class ErrorBoundary {
  private calls?: Set<ErrorCapture>;

  private parent?: ErrorBoundary;

  constructor(parent?: ErrorBoundary) {
    this.parent = parent;
  }

  register(cleanup: ErrorCapture): ErrorCapture {
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
