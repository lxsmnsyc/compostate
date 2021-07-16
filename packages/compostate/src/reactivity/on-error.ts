import { ERROR } from './contexts';
import effect from './effect';
import ErrorBoundary, { ErrorCapture } from './error-boundary';

export const GLOBAL = new ErrorBoundary();

ERROR.push(GLOBAL);

export default function onError(callback: ErrorCapture): void {
  const collection = ERROR.getContext();

  if (collection) {
    effect(() => collection.register(callback));
  }
}
