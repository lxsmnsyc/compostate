import {
  batch,
  effect,
  onCleanup,
  untrack,
  captureError,
  createRoot,
  batchCleanup,
} from 'compostate';
import {
  registerEvent,
  remove,
  setAttribute,
  setUnmounting,
  UNMOUNTING,
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

    onCleanup(registerEvent(el, key, wrappedEvent));
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
        const cleanup = createRoot(() => (
          batchCleanup(() => renderChildren(el, props.children, null, null))
        ));

        // If the node is unmounting,
        // we don't have to unmount the
        // rest of the children recursively
        onCleanup(() => {
          const parent = UNMOUNTING;
          setUnmounting(true);
          try {
            cleanup();
          } finally {
            setUnmounting(parent);
          }
        });
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
