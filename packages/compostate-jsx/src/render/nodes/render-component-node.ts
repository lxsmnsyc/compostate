import {
  batch,
  batchEffects,
  effect,
  onCleanup,
  reactive,
  untrack,
} from 'compostate';
import {
  MOUNT,
  UNMOUNT,
  Lifecycle,
  setMount,
  setUnmount,
} from '../../lifecycle';
import { PROVIDER, setProvider } from '../../provider';
import { setSuspense, SUSPENSE } from '../../suspense';
import {
  Reactive,
  RefAttributes,
  VComponent,
  VNode,
  WithChildren,
} from '../../types';

export default function renderComponentNode<P extends Record<string, any>>(
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
  const parentMount = MOUNT;
  const parentUnmount = UNMOUNT;
  const mounts: Lifecycle[] = [];
  const unmounts: Lifecycle[] = [];
  setMount(mounts);
  setUnmount(unmounts);

  // Create a provider boundary
  const parentProvider = PROVIDER;
  const parentSuspense = SUSPENSE;

  const provider = {
    data: reactive({}),
    parent: parentProvider,
  };

  const newBoundary = {
    suspense: parentSuspense,
    provider,
  };

  let result: VNode;

  // Batch effects inside the constructor
  // so that it only runs when the element
  // actually gets committed.
  // This is useful in SSR so that effects
  // never run and only run on client-side.
  const flushEffects = batchEffects(() => {
    setSuspense(newBoundary.suspense);
    setProvider(newBoundary.provider);
    try {
      result = constructor(unwrappedProps);
    } finally {
      setProvider(parentProvider);
      setSuspense(parentSuspense);
    }
  });

  // Get all captured lifecycle callbacks
  setUnmount(parentUnmount);
  setMount(parentMount);

  // Create an effect scope
  // this is to properly setup
  // the error boundary

  if (mounts.length) {
    untrack(() => {
      batch(() => {
        mounts.forEach((mount) => {
          mount();
        });
      });
    });
  }

  if (unmounts.length) {
    onCleanup(() => {
      batch(() => {
        unmounts.forEach((unmount) => {
          unmount();
        });
      });
    });
  }

  effect(() => {
    flushEffects();
  });

  return result;
}
