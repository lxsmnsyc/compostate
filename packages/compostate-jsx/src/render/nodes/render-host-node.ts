import {
  batch,
  effect,
  untrack,
  onCleanup,
  captureError,
} from 'compostate';
import { Marker, registerEvent, setAttribute } from '../../dom';
import { claimHydration, HYDRATION } from '../../hydration';
import { Reactive, RefAttributes } from '../../types';
import { DOMAttributes } from '../../types/dom';
import {
  Boundary,
  InternalShallowReactive,
  Lazy,
  RenderChildren,
} from '../types';
import { watchMarkerForNode } from '../watch-marker';

function applyHostProperty(
  el: HTMLElement,
  key: string,
  property: any,
): void {
  const capture = captureError();
  if (key.startsWith('on')) {
    const wrappedEvent = <E extends Event>(evt: E) => {
      // In case of synchronous calls
      untrack(() => {
        // Allow update batching
        try {
          batch(() => {
            (property as unknown as EventListener)(evt);
          });
        } catch (error) {
          capture(error);
        }
      });
    };

    onCleanup(registerEvent(el, key, wrappedEvent));
  } else if (key === 'style') {
    // TODO Style Object parsing
  } else if (typeof property === 'boolean') {
    setAttribute(el, key, property ? 'true' : null);
  } else {
    setAttribute(el, key, property as string);
  }
  return undefined;
}

export default function renderHostNode<P extends DOMAttributes<Element>>(
  boundary: Boundary,
  root: HTMLElement,
  constructor: string,
  props: Reactive<P> & RefAttributes<Element>,
  renderChildren: RenderChildren,
  marker: Lazy<Marker | null> = null,
  suspended: InternalShallowReactive<boolean | undefined> = false,
): void {
  const hydration = HYDRATION.getContext();
  const claim = hydration ? claimHydration(hydration) : null;
  let el = document.createElement(constructor);

  if (hydration) {
    if (claim) {
      if (claim.tagName !== constructor.toUpperCase()) {
        throw new Error(`Hydration mismatch. (Expected: ${constructor}, Received: ${claim.tagName})`);
      }
      el = claim as HTMLElement;
    } else {
      throw new Error(`Hydration mismatch. (Expected: ${constructor}, Received: null)`);
    }
  }

  Object.keys(props).forEach((key) => {
    // Ref handler
    if (key === 'ref') {
      const elRef = props.ref;
      if (elRef) {
        elRef.value = el;
      }
    // Children handler
    } else if (key === 'children') {
      renderChildren(boundary, el, props.children);
    } else {
      const rawProperty = props[key as keyof typeof props];
      if (typeof rawProperty === 'object') {
        if ('derive' in rawProperty) {
          effect(() => {
            applyHostProperty(el, key, rawProperty.derive());
          });
        } else {
          effect(() => {
            applyHostProperty(el, key, rawProperty.value);
          });
        }
      } else {
        applyHostProperty(el, key, rawProperty);
      }
    }
  });

  watchMarkerForNode(root, marker, el, suspended);
}
