import {
  batch,
  Cleanup,
  effect,
  onCleanup,
  untrack,
} from 'compostate';
import { registerEvent, setAttribute } from '../../dom';
import { handleError } from '../../error-boundary';
import { claimHydration, HYDRATION } from '../../hydration';
import { Reactive, RefAttributes, VNode } from '../../types';
import { DOMAttributes } from '../../types/dom';
import renderChildren from '../render-children';
import { Boundary } from '../types';

function applyHostProperty(
  boundary: Boundary,
  el: HTMLElement,
  key: string,
  property: any,
): Cleanup | undefined {
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
  constructor: string,
  props: Reactive<P> & RefAttributes<Element> | null,
): VNode {
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

  if (props) {
    Object.keys(props).forEach((key) => {
      // Ref handler
      if (key === 'ref') {
        const elRef = props.ref;
        if (elRef) {
          elRef.value = el;
        }
      // Children handler
      } else if (key === 'children') {
        renderChildren(boundary, el, props.children, null);
      } else {
        const rawProperty = props[key as keyof typeof props];
        if (typeof rawProperty === 'object') {
          if ('value' in rawProperty) {
            effect(() => (
              applyHostProperty(boundary, el, key, rawProperty.value)
            ));
          } else {
            effect(() => (
              applyHostProperty(boundary, el, key, rawProperty.derive())
            ));
          }
        } else {
          const cleanup = applyHostProperty(boundary, el, key, rawProperty);
          if (cleanup) {
            onCleanup(cleanup);
          }
        }
      }
    });
  }

  return el;
}
