import { ERROR_BOUNDARY } from './nodes/error-boundary';
import onCleanup from './on-cleanup';
import { ErrorCapture } from './types';

export default function onError(errorCapture: ErrorCapture): void {
  if (ERROR_BOUNDARY) {
    onCleanup(ERROR_BOUNDARY.register(errorCapture));
  }
}
