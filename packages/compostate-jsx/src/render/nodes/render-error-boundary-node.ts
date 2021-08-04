import { effect } from 'compostate';
import { PROVIDER } from '../../provider';
import { derived } from '../../reactivity';
import { ErrorBoundaryProps } from '../../special';
import { SUSPENSE } from '../../suspense';
import { Reactive, VNode } from '../../types';
import { Boundary } from '../types';

export default function renderErrorBoundaryNode(
  boundary: Boundary,
  props: Reactive<ErrorBoundaryProps>,
): VNode {
  const { render, onError } = props;

  let handleError: (error: Error) => void;

  if (onError == null) {
    // no-op
  } else if (typeof onError === 'function') {
    handleError = onError;
  } else if ('derive' in onError) {
    effect(() => {
      const handler = onError.derive();
      if (handler) {
        handleError = handler;
      }
    });
  } else {
    effect(() => {
      const handler = onError.value;
      if (handler) {
        handleError = handler;
      }
    });
  }

  if (render == null) {
    return undefined;
  }
  if (typeof render === 'function') {
    return derived(() => {
      SUSPENSE.push(boundary.suspense);
      PROVIDER.push(boundary.provider);
      try {
        return render();
      } catch (error) {
        if (handleError) {
          handleError(error);
          return undefined;
        }
        throw error;
      } finally {
        PROVIDER.pop();
        SUSPENSE.pop();
      }
    });
  }
  if ('derive' in render) {
    return derived(() => {
      SUSPENSE.push(boundary.suspense);
      PROVIDER.push(boundary.provider);
      try {
        return render.derive()?.();
      } catch (error) {
        if (handleError) {
          handleError(error);
          return undefined;
        }
        throw error;
      } finally {
        PROVIDER.pop();
        SUSPENSE.pop();
      }
    });
  }
  return derived(() => {
    SUSPENSE.push(boundary.suspense);
    PROVIDER.push(boundary.provider);
    try {
      return render.value?.();
    } catch (error) {
      if (handleError) {
        handleError(error);
        return undefined;
      }
      throw error;
    } finally {
      PROVIDER.pop();
      SUSPENSE.pop();
    }
  });
}
