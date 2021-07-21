import effect from './effect';
import ErrorBoundary, { ERROR, ErrorCapture } from './nodes/error-boundary';

export const GLOBAL = new ErrorBoundary();

ERROR.push(GLOBAL);

export default function onError(callback: ErrorCapture): void {
  const collection = ERROR.getContext();

  if (collection) {
    effect(() => collection.register(callback));
  }
}
