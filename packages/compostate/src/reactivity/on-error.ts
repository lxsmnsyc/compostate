import { ERROR_BOUNDARY, registerErrorCapture } from './nodes/error-boundary';
import onCleanup from './on-cleanup';
import { ErrorCapture } from './types';

export default function onError(errorCapture: ErrorCapture): void {
  if (ERROR_BOUNDARY) {
    onCleanup(registerErrorCapture(ERROR_BOUNDARY, errorCapture));
  }
}
