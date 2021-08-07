import {
  captureError,
  effect,
  errorBoundary,
  onError,
} from 'compostate';
import { derived } from '../../reactivity';
import { ErrorBoundaryProps } from '../../special';
import { Reactive, VNode } from '../../types';

export default function renderErrorBoundaryNode(
  props: Reactive<ErrorBoundaryProps>,
): VNode {
  const { render, onError: errorHandler } = props;

  return errorBoundary(() => {
    let handleError: (error: Error) => void;
    onError((error) => {
      handleError(error);
    });
    if (errorHandler == null) {
      // no-op
    } else if (typeof errorHandler === 'function') {
      handleError = errorHandler;
    } else if ('derive' in errorHandler) {
      effect(() => {
        const handler = errorHandler.derive();
        if (handler) {
          handleError = handler;
        }
      });
    } else {
      effect(() => {
        const handler = errorHandler.value;
        if (handler) {
          handleError = handler;
        }
      });
    }

    if (render == null) {
      return undefined;
    }
    const internallyHandleError = captureError();
    if (typeof render === 'function') {
      return derived(() => {
        try {
          return render();
        } catch (error) {
          internallyHandleError(error);
          return undefined;
        }
      });
    }
    if ('derive' in render) {
      return derived(() => {
        try {
          return render.derive()?.();
        } catch (error) {
          internallyHandleError(error);
          return undefined;
        }
      });
    }
    return derived(() => {
      try {
        return render.value?.();
      } catch (error) {
        internallyHandleError(error);
        return undefined;
      }
    });
  });
}
