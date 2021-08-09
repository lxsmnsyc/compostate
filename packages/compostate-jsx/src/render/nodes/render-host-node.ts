import {
  batch,
  effect,
  onCleanup,
  untrack,
  captureError,
} from 'compostate';
import {
  registerEvent,
  remove,
  setAttribute,
} from '../../dom';
import { claimHydration, HYDRATION } from '../../hydration';
import { Reactive, RefAttributes, VNode } from '../../types';
import { DOMAttributes } from '../../types/dom';
import renderChildren from '../render-children';

function applyHostProperty(
  el: HTMLElement,
  key: string,
  property: any,
): void {
  if (key.startsWith('on')) {
    const errorHandler = captureError();

    onCleanup(registerEvent(el, key, (evt) => {
      // In case of synchronous calls
      untrack(() => {
        // Allow update batching
        try {
          batch(() => {
            (property as unknown as EventListener)(evt);
          });
        } catch (error) {
          errorHandler(error);
        }
      });
    }));
  } else if (key === 'style') {
    // TODO Style Object parsing
  } else if (typeof property === 'boolean') {
    setAttribute(el, key, property ? 'true' : null);
  } else {
    setAttribute(el, key, property as string);
  }
}

export default function renderHostNode<P extends DOMAttributes<Element>>(
  constructor: string,
  props: Reactive<P> & RefAttributes<Element> | null,
): VNode {
  let el = document.createElement(constructor);

  if (HYDRATION) {
    const claim = claimHydration(HYDRATION);
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
        renderChildren(el, props.children, null, null);
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
  }

  onCleanup(() => {
    remove(el);
  });

  return el;
}
