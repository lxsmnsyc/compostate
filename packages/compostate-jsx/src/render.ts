/* eslint-disable no-param-reassign */
import {
  batchCleanup,
  createRoot,
  untrack,
} from 'compostate';
import {
  Fragment,
  Suspense,
} from './core';
import { createHydration, HYDRATION } from './hydration';
import renderChildren from './render/render-children';
import unwrapRef from './render/unwrap-ref';
import {
  VNode,
  WithChildren,
} from './types';

export function render(root: HTMLElement, element: VNode): () => void {
  return createRoot(() => batchCleanup(() => {
    renderChildren({}, root, element);
  }));
}

export function hydrate(root: HTMLElement, element: VNode): () => void {
  const popHydration = HYDRATION.push(createHydration(root));
  try {
    return render(root, element);
  } finally {
    popHydration();
  }
}

// Based on https://github.com/WebReflection/domtagger/blob/master/esm/sanitizer.js
const VOID_ELEMENTS = /^(?:area|base|br|col|embed|hr|img|input|keygen|link|menuitem|meta|param|source|track|wbr)$/i;

function propsToString(props: Record<string, any>): string {
  return Object.entries(props).map(([key, value]) => {
    switch (key) {
      case 'ref':
      case 'children':
      case 'innerHTML':
      case 'textContent':
        return '';
      default:
        if (key.startsWith('on')) {
          return '';
        }
        return `${value}`;
    }
  }).join(' ');
}

export function renderToString(element: VNode): string {
  if (Array.isArray(element)) {
    return element.map((el) => renderToString(el)).join('');
  }
  if (element == null || typeof element === 'boolean') {
    return '';
  }
  if (typeof element === 'string' || typeof element === 'number') {
    return `${element}`;
  }
  if ('value' in element) {
    return renderToString(element.value);
  }
  if ('derive' in element) {
    return renderToString(element.derive());
  }
  const { type, props } = element;
  const constructor = untrack(() => unwrapRef(type));

  if (constructor) {
    if (typeof constructor === 'string') {
      if (VOID_ELEMENTS.test(constructor)) {
        return `<${constructor} ${propsToString(props)} />`;
      }
      let content = '';
      Object.entries(props).forEach(([key, value]) => {
        switch (key) {
          case 'textContent':
          case 'innerHTML':
            content = value as string;
            break;
          case 'children':
            content = renderToString(value);
            break;
          default:
            break;
        }
      });

      return `<${constructor} ${propsToString(props)}>${content}</${constructor}>`;
    }
    if (typeof constructor === 'function') {
      return renderToString(constructor(props));
    }
    if (constructor === Fragment) {
      return renderToString(props.children);
    }
    if (constructor === Suspense) {
      return renderToString(props.fallback);
    }
  }
  return renderToString((props as WithChildren).children);
}
