import {
  batch,
  batchEffects,
  effect,
  onCleanup,
  reactive,
  untrack,
} from 'compostate';
import ErrorBoundary, { ERROR_BOUNDARY, handleError } from '../../error-boundary';
import { MOUNT, UNMOUNT, ERROR } from '../../lifecycle';
import { PROVIDER } from '../../provider';
import { SUSPENSE } from '../../suspense';
import {
  Reactive,
  RefAttributes,
  VComponent,
  VNode,
  WithChildren,
} from '../../types';
import {
  Boundary,
} from '../types';

export default function renderComponentNode<P extends Record<string, any>>(
  boundary: Boundary,
  constructor: VComponent<P>,
  props: Reactive<P>,
): VNode {
  // Create a reactive object form for the props
  const unwrappedProps = reactive<P>({} as P);

  // Track individual props
  Object.keys(props).forEach((key: keyof typeof props) => {
    if (key === 'ref') {
      (unwrappedProps as RefAttributes<any>).ref = (props as RefAttributes<any>).ref;
    } else if (key === 'children') {
      (unwrappedProps as WithChildren).children = (props as WithChildren).children;
    } else {
      const property = props[key];
      if (typeof property === 'object') {
        if ('value' in property) {
          effect(() => {
            unwrappedProps[key] = property.value;
          });
        } else if ('derive' in property) {
          effect(() => {
            unwrappedProps[key] = property.derive();
          });
        } else {
          unwrappedProps[key] = property;
        }
      } else {
        unwrappedProps[key] = property;
      }
    }
  });

  // Push lifecycle hooks
  const popMount = MOUNT.push([]);
  const popUnmount = UNMOUNT.push([]);
  const popError = ERROR.push([]);

  // Create an error boundary and link
  // the parent error boundary
  const errorBoundary = new ErrorBoundary(boundary.error);

  // Create a provider boundary
  const provider = {
    data: reactive({}),
    parent: boundary.provider,
  };

  const newBoundary = {
    suspense: boundary.suspense,
    error: errorBoundary,
    provider,
  };

  let result: VNode;

  // Batch effects inside the constructor
  // so that it only runs when the element
  // actually gets committed.
  // This is useful in SSR so that effects
  // never run and only run on client-side.
  const flushEffects = batchEffects(() => {
    const popSuspense = SUSPENSE.push(newBoundary.suspense);
    const popProvider = PROVIDER.push(newBoundary.provider);
    const popErrorBoundary = ERROR_BOUNDARY.push(newBoundary.error);
    try {
      result = constructor(unwrappedProps);
    } finally {
      popErrorBoundary();
      popSuspense();
      popProvider();
    }
  });

  // Get all captured lifecycle callbacks
  const mounts = popMount();
  const unmounts = popUnmount();
  const errors = popError();

  // Register all error handlers
  // We do this since if we use compostate's
  // onError, it gets registered to the parent
  // handler.
  errors.forEach((item) => {
    onCleanup(errorBoundary.register(item));
  });

  // Create an effect scope
  // this is to properly setup
  // the error boundary

  if (mounts.length) {
    untrack(() => {
      mounts.forEach((mount) => {
        batch(() => {
          mount();
        });
      });
    });
  }

  if (unmounts.length) {
    onCleanup(() => {
      unmounts.forEach((unmount) => {
        batch(() => {
          unmount();
        });
      });
    });
  }

  effect(() => {
    flushEffects();
  }, {
    onError(error) {
      handleError(errorBoundary, error);
    },
  });

  return result;
}
