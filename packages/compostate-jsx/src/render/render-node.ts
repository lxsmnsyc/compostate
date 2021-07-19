import {
  effect,
  EffectCleanup,
  Ref,
} from 'compostate';
import { Marker } from '../dom';
import { setupErrorBoundary } from '../error-boundary';
import { ShallowReactive, VRawElement } from '../types';
import renderComponentNode from './nodes/render-component-node';
import renderHostNode from './nodes/render-host-node';
import renderSpecialNode, { SpecialNode } from './nodes/render-special-node';
import { Boundary, RenderChildren } from './types';
import unwrapRef from './unwrap-ref';

export default function renderNode(
  boundary: Boundary,
  root: HTMLElement,
  node: VRawElement,
  renderChildren: RenderChildren,
  marker: ShallowReactive<Marker | null> = null,
  suspended: Ref<boolean | undefined> | boolean | undefined = false,
): EffectCleanup {
  return effect(() => {
    // Setup parent error boundary
    // because of untrack scope
    setupErrorBoundary(boundary.error);

    effect(() => {
      // Unwrap constructor (useful if constructor is reactively changed).
      const constructor = unwrapRef(node.type);

      // Merge children with props
      const props = {
        ...node.props,
      };

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
    });
  });
}
