import { ERROR_BOUNDARY } from './nodes/error-boundary';
import onCleanup from './on-cleanup';
import { ErrorCapture } from './types';

export default function onError(errorCapture: ErrorCapture): void {
  const boundary = ERROR_BOUNDARY.current();

  if (boundary) {
    onCleanup(boundary.register(errorCapture));
  }
}
