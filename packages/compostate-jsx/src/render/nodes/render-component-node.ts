import {
  batch,
  batchEffects,
  effect,
  EffectCleanup,
  reactive,
  untrack,
} from 'compostate';
import { Marker } from '../../dom';
import ErrorBoundary, { handleError } from '../../error-boundary';
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
  InternalShallowReactive,
  Lazy,
  RenderChildren,
} from '../types';

export default function renderComponentNode<P extends Record<string, any>>(
  boundary: Boundary,
  root: HTMLElement,
  constructor: VComponent<P>,
  props: Reactive<P>,
  renderChildren: RenderChildren,
  marker: Lazy<Marker | null> = null,
  suspended: InternalShallowReactive<boolean | undefined> = false,
): EffectCleanup {
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

  let result: VNode;

  // Batch effects inside the constructor
  // so that it only runs when the element
  // actually gets committed.
  // This is useful in SSR so that effects
  // never run and only run on client-side.
  const flushEffects = untrack(() => (
    batchEffects(() => {
      const popSuspense = SUSPENSE.push(boundary.suspense);
      const popProvider = PROVIDER.push(boundary.provider);
      try {
        result = constructor(unwrappedProps);
      } finally {
        popSuspense();
        popProvider();
      }
    })
  ));

  // Get all captured lifecycle callbacks
  const mounts = popMount();
  const unmounts = popUnmount();
  const errors = popError();

  // Register all error handlers
  // We do this since if we use compostate's
  // onError, it gets registered to the parent
  // handler.
  const cleanups = errors.map((item) => errorBoundary.register(item));

  const newBoundary = {
    suspense: boundary.suspense,
    error: errorBoundary,
    provider,
  };

  // Create an effect scope
  // this is to properly setup
  // the error boundary

  cleanups.push(renderChildren(newBoundary, root, result, marker, suspended));
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
    cleanups.push(() => {
      untrack(() => {
        unmounts.forEach((unmount) => {
          batch(() => {
            unmount();
          });
        });
      });
    });
  }

  cleanups.push(effect(() => {
    flushEffects();
  }, {
    onError(error) {
      handleError(errorBoundary, error);
    },
  }));

  return () => {
    cleanups.forEach((cleanup) => {
      cleanup();
    });
  };
}
