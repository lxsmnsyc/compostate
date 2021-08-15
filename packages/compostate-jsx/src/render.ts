/* eslint-disable no-param-reassign */
import {
  computation,
  createRoot,
} from 'compostate';
import { createHydration, HYDRATION, setHydration } from './hydration';
import renderChildren from './render/render-children';
import {
  VNode,
  WithChildren,
} from './types';

export function render(root: HTMLElement, element: () => VNode): () => void {
  return createRoot(() => computation<VNode>((prev) => {
    const next = element();
    renderChildren(
      root,
      next,
      prev,
      null,
    );
    return next;
  }));
}

export function hydrate(root: HTMLElement, element: () => VNode): () => void {
  const parent = HYDRATION;
  setHydration(createHydration(root));
  try {
    return render(root, element);
  } finally {
    setHydration(parent);
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
  if (typeof element === 'function') {
    return renderToString(element());
  }
  const { type, props } = element;

  if (typeof type === 'string') {
    if (VOID_ELEMENTS.test(type)) {
      return `<${type} ${propsToString(props)} />`;
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

    return `<${type} ${propsToString(props)}>${content}</${type}>`;
  }
  if (typeof type === 'function') {
    return renderToString(type(props));
  }
  return renderToString((props as WithChildren).children);
}
