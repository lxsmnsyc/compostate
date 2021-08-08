import { ERROR_BOUNDARY, handleError } from './nodes/error-boundary';
import { ErrorCapture } from './types';

export default function captureError(): ErrorCapture {
  const boundary = ERROR_BOUNDARY;
  return (error) => {
    handleError(boundary, error);
  };
}
