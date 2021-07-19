import { pushContext } from '../context';
import { ERROR } from './contexts';
import effect from './effect';
import ErrorBoundary, { ErrorCapture } from './error-boundary';

export const GLOBAL = new ErrorBoundary();

pushContext(ERROR, GLOBAL);

export default function onError(callback: ErrorCapture): void {
  const collection = ERROR.current;

  if (collection) {
    effect(() => collection.register(callback));
  }
}
