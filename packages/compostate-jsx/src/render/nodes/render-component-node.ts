import {
  batch,
  batchEffects,
  effect,
  reactive,
  Ref,
  untrack,
} from 'compostate';
import { Marker } from '../../dom';
import ErrorBoundary, { setupErrorBoundary } from '../../error-boundary';
import { MOUNT, UNMOUNT, ERROR } from '../../lifecycle';
import { PROVIDER } from '../../provider';
import { SUSPENSE } from '../../suspense';
import {
  Reactive,
  RefAttributes,
  ShallowReactive,
  VComponent,
  VNode,
  WithChildren,
} from '../../types';
import { Boundary, RenderChildren } from '../types';
import unwrapRef from '../unwrap-ref';

export default function renderComponentNode<P extends Record<string, any>>(
  boundary: Boundary,
  root: HTMLElement,
  constructor: VComponent<P>,
  props: Reactive<P>,
  renderChildren: RenderChildren,
  marker: ShallowReactive<Marker | null> = null,
  suspended: Ref<boolean> | boolean = false,
): void {
  // Create a reactive object form for the props
  const unwrappedProps = reactive<P>({} as P);

  // Track individual props
  Object.keys(props).forEach((key: keyof typeof props) => {
    if (key === 'ref') {
      effect(() => {
        (unwrappedProps as RefAttributes<any>).ref = (props as RefAttributes<any>).ref;
      });
    } else if (key === 'children') {
      effect(() => {
        (unwrappedProps as WithChildren).children = (props as WithChildren).children;
      });
    } else {
      effect(() => {
        unwrappedProps[key] = unwrapRef(props[key]);
      });
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
  errors.forEach((handler) => {
    effect(() => errorBoundary.register(handler));
  });

  // Create an effect scope
  // this is to properly setup
  // the error boundary
  effect(() => {
    setupErrorBoundary(errorBoundary);

    const newBoundary = {
      suspense: boundary.suspense,
      error: errorBoundary,
      provider,
    };

    // Render constructor result
    renderChildren(newBoundary, root, result, marker, suspended);

    // Run lifecycles
    effect(() => {
      untrack(() => {
        mounts.forEach((mount) => {
          batch(() => {
            mount();
          });
        });
      });

      return () => {
        untrack(() => {
          unmounts.forEach((unmount) => {
            batch(() => {
              unmount();
            });
          });
        });
      };
    });

    // Flush effects
    effect(() => {
      flushEffects();
    });
  });
}
