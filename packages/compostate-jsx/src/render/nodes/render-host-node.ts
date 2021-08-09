import {
  batch,
  effect,
  onCleanup,
  untrack,
  captureError,
  watch,
  Cleanup,
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
): Cleanup | undefined {
  if (key.startsWith('on')) {
    const errorHandler = captureError();

    const wrappedEvent = <E extends Event>(evt: E) => {
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
  constructor: string,
  props: Reactive<P> & RefAttributes<Element> | null,
): VNode {
  const hydration = HYDRATION;
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
        renderChildren(el, props.children, null, null);
      } else {
        const rawProperty = props[key as keyof typeof props];
        if (typeof rawProperty === 'object') {
          if ('derive' in rawProperty) {
            effect(() => (
              applyHostProperty(el, key, rawProperty.derive())
            ));
          } else {
            let cleanup: Cleanup | undefined;
            watch(rawProperty, () => {
              cleanup?.();
              cleanup = applyHostProperty(el, key, rawProperty.value);
            }, true);
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
