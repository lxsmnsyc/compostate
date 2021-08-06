import {
  batch,
  batchEffects,
  effect,
  reactive,
  untrack,
  errorBoundary,
  onCleanup,
} from 'compostate';
import { Marker } from '../../dom';
import { MOUNT, UNMOUNT } from '../../lifecycle';
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
): void {
  errorBoundary(() => {
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
          if ('derive' in property) {
            effect(() => {
              unwrappedProps[key] = property.derive();
            });
          } else if ('value' in property) {
            effect(() => {
              unwrappedProps[key] = property.value;
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
    const flushEffects = batchEffects(() => {
      const popSuspense = SUSPENSE.push(boundary.suspense);
      const popProvider = PROVIDER.push(boundary.provider);
      try {
        result = constructor(unwrappedProps);
      } finally {
        popSuspense();
        popProvider();
      }
    });

    // Get all captured lifecycle callbacks
    const mounts = popMount();
    const unmounts = popUnmount();

    const newBoundary = {
      suspense: boundary.suspense,
      provider,
    };

    renderChildren(newBoundary, root, result, marker, suspended);

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
        untrack(() => {
          unmounts.forEach((unmount) => {
            batch(() => {
              unmount();
            });
          });
        });
      });
    }

    effect(() => {
      flushEffects();
    });
  });
}
