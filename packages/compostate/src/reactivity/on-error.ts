import { ERROR_BOUNDARY } from './nodes/error-boundary';
import { ErrorCapture } from './types';

export default function onError(errorCapture: ErrorCapture): void {
  const boundary = ERROR_BOUNDARY.current();

  if (boundary) {
    boundary.register(errorCapture);
  }
}
