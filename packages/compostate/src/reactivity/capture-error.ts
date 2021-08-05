import { ERROR_BOUNDARY } from './nodes/error-boundary';
import { ErrorCapture } from './types';

export default function captureError(): ErrorCapture {
  const boundary = ERROR_BOUNDARY;
  if (boundary) {
    return (error) => {
      boundary.handleError(error);
    };
  }
  return (error) => {
    throw error;
  };
}
