import { createErrorBoundary, ERROR_BOUNDARY, setErrorBoundary } from './nodes/error-boundary';

export default function errorBoundary<T>(callback: () => T): T {
  const parentInstance = ERROR_BOUNDARY;
  setErrorBoundary(createErrorBoundary(parentInstance));
  try {
    return callback();
  } finally {
    setErrorBoundary(parentInstance);
  }
}
