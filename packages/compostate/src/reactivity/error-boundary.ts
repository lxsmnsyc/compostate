import ErrorBoundary, { ERROR_BOUNDARY, setErrorBoundary } from './nodes/error-boundary';

export default function errorBoundary<T>(callback: () => T): T {
  const parentInstance = ERROR_BOUNDARY;
  setErrorBoundary(new ErrorBoundary(parentInstance));
  try {
    return callback();
  } finally {
    setErrorBoundary(parentInstance);
  }
}
