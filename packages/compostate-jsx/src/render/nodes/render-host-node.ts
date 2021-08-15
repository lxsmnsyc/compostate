import {
  onCleanup,
  captureError,
  watch,
} from 'compostate';
import {
  createStyle,
  registerEvent,
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
      try {
        (property as unknown as EventListener)(evt);
      } catch (error) {
        errorHandler(error);
      }
    }));
  } else if (key === 'style') {
    el.setAttribute(key, createStyle(property));
  // typeof is slow
  } else if (property === true || property === false) {
    setAttribute(el, key, property ? 'true' : null);
  } else {
    setAttribute(el, key, property as string);
  }
  return undefined;
}

const getKeys = Object.keys;

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
    const keys = getKeys(props);

    for (let i = 0, len = keys.length, key: string; i < len; i++) {
      key = keys[i];
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
        if (typeof rawProperty === 'function') {
          watch(rawProperty, (prop) => {
            applyHostProperty(el, key, prop);
          });
        } else {
          applyHostProperty(el, key, rawProperty);
        }
      }
    }
  }

  return el;
}
