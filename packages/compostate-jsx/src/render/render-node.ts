import {
  effect,
} from 'compostate';
import { Marker } from '../dom';
import { VConstructor, VRawElement } from '../types';
import renderComponentNode from './nodes/render-component-node';
import renderHostNode from './nodes/render-host-node';
import renderSpecialNode, { SpecialNode } from './nodes/render-special-node';
import {
  Boundary,
  InternalShallowReactive,
  Lazy,
  RenderChildren,
} from './types';

function renderConstructor(
  boundary: Boundary,
  root: HTMLElement,
  constructor: VConstructor,
  props: Record<string, any>,
  renderChildren: RenderChildren,
  marker: Lazy<Marker | null> = null,
  suspended: InternalShallowReactive<boolean | undefined> = false,
): void {
  // Construct DOM element
  if (typeof constructor === 'string') {
    renderHostNode(
      boundary,
      root,
      constructor,
      props,
      renderChildren,
      marker,
      suspended,
    );
  } else if (typeof constructor === 'function') {
    renderComponentNode(
      boundary,
      root,
      constructor,
      props,
      renderChildren,
      marker,
      suspended,
    );
  } else {
    renderSpecialNode(
      boundary,
      root,
      {
        constructor,
        props,
      } as SpecialNode,
      renderChildren,
      marker,
      suspended,
    );
  }
}

export default function renderNode(
  boundary: Boundary,
  root: HTMLElement,
  node: VRawElement,
  renderChildren: RenderChildren,
  marker: Lazy<Marker | null> = null,
  suspended: InternalShallowReactive<boolean | undefined> = false,
): void {
  const rawConstructor = node.type;
  const props = {
    ...node.props,
  };

  if (typeof rawConstructor === 'object') {
    if ('derive' in rawConstructor) {
      effect(() => {
        // Unwrap constructor (useful if constructor is reactively changed).
        renderConstructor(
          boundary,
          root,
          rawConstructor.derive(),
          props,
          renderChildren,
          marker,
          suspended,
        );
      });
    } else {
      effect(() => {
        // Unwrap constructor (useful if constructor is reactively changed).
        renderConstructor(
          boundary,
          root,
          rawConstructor.value,
          props,
          renderChildren,
          marker,
          suspended,
        );
      });
    }
  } else {
    renderConstructor(
      boundary,
      root,
      rawConstructor,
      props,
      renderChildren,
      marker,
      suspended,
    );
  }
}
