import {
  effect,
  Cleanup,
} from 'compostate';
import { Marker } from '../dom';
import { handleError } from '../error-boundary';
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
): Cleanup {
  // Construct DOM element
  if (typeof constructor === 'string') {
    return renderHostNode(
      boundary,
      root,
      constructor,
      props,
      renderChildren,
      marker,
      suspended,
    );
  }
  if (typeof constructor === 'function') {
    return renderComponentNode(
      boundary,
      root,
      constructor,
      props,
      renderChildren,
      marker,
      suspended,
    );
  }
  return renderSpecialNode(
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

export default function renderNode(
  boundary: Boundary,
  root: HTMLElement,
  node: VRawElement,
  renderChildren: RenderChildren,
  marker: Lazy<Marker | null> = null,
  suspended: InternalShallowReactive<boolean | undefined> = false,
): Cleanup {
  const rawConstructor = node.type;
  const props = {
    ...node.props,
  };

  if (typeof rawConstructor === 'object') {
    if ('value' in rawConstructor) {
      return effect(() => {
        // Unwrap constructor (useful if constructor is reactively changed).
        const constructor = rawConstructor.value;

        return renderConstructor(
          boundary,
          root,
          constructor,
          props,
          renderChildren,
          marker,
          suspended,
        );
      }, {
        onError(error) {
          handleError(boundary.error, error);
        },
      });
    }
    return effect(() => {
      // Unwrap constructor (useful if constructor is reactively changed).
      const constructor = rawConstructor.derive();

      return renderConstructor(
        boundary,
        root,
        constructor,
        props,
        renderChildren,
        marker,
        suspended,
      );
    }, {
      onError(error) {
        handleError(boundary.error, error);
      },
    });
  }
  return renderConstructor(
    boundary,
    root,
    rawConstructor,
    props,
    renderChildren,
    marker,
    suspended,
  );
}
