import {
  batch,
  effect,
  EffectCleanup,
  Ref,
  untrack,
} from 'compostate';
import { Marker, registerEvent, setAttribute } from '../../dom';
import { handleError } from '../../error-boundary';
import { claimHydration, HYDRATION } from '../../hydration';
import { Reactive, RefAttributes } from '../../types';
import { DOMAttributes } from '../../types/dom';
import { Boundary, Lazy, RenderChildren } from '../types';
import { UNMOUNTING, watchMarkerForNode } from '../watch-marker';

function applyHostProperty(
  boundary: Boundary,
  el: HTMLElement,
  key: string,
  property: any,
): EffectCleanup | undefined {
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
          handleError(boundary.error, error);
        }
      });
    };

    return registerEvent(el, key, wrappedEvent);
  }
  if (key === 'style') {
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
  suspended: Ref<boolean | undefined> | boolean | undefined = false,
): EffectCleanup {
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

  const cleanups: EffectCleanup[] = [];

  Object.keys(props).forEach((key) => {
    // Ref handler
    if (key === 'ref') {
      const elRef = props.ref;
      if (elRef) {
        elRef.value = el;
      }
    // Children handler
    } else if (key === 'children') {
      const cleanup = renderChildren(boundary, el, props.children);
      const children = () => {
        const popUnmounting = UNMOUNTING.push(true);
        try {
          cleanup();
        } finally {
          popUnmounting();
        }
      };
      cleanups.push(children);
    } else {
      const rawProperty = props[key as keyof typeof props];
      if (typeof rawProperty === 'object' && 'value' in rawProperty) {
        cleanups.push(effect(() => (
          applyHostProperty(boundary, el, key, rawProperty.value)
        )));
      } else {
        const cleanup = applyHostProperty(boundary, el, key, rawProperty);
        if (cleanup) {
          cleanups.push(cleanup);
        }
      }
    }
  });

  cleanups.push(watchMarkerForNode(root, marker, el, suspended, boundary.error));

  return () => {
    cleanups.forEach((cleanup) => {
      cleanup();
    });
  };
}
