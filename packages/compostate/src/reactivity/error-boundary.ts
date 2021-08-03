import ErrorBoundary, { ERROR_BOUNDARY } from './nodes/error-boundary';

export default function errorBoundary<T>(callback: () => T): T {
  const instance = new ErrorBoundary(ERROR_BOUNDARY.current());
  ERROR_BOUNDARY.push(instance);
  try {
    return callback();
  } finally {
    ERROR_BOUNDARY.pop();
  }
}
