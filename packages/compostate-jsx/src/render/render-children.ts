import { VNode } from '../types';
import { Marker } from '../dom';
import renderArray from './render-array';
import { Boundary, InternalShallowReactive, Lazy } from './types';
import renderText from './render-text';
import renderRef from './render-ref';
import renderNode from './render-node';
import renderDerived from './render-derived';

export default function renderChildren(
  boundary: Boundary,
  root: HTMLElement,
  children: VNode,
  marker: Lazy<Marker | null> = null,
  suspended: InternalShallowReactive<boolean | undefined> = false,
): void {
  if (Array.isArray(children)) {
    renderArray(
      boundary,
      root,
      children,
      renderChildren,
      marker,
      suspended,
    );
  } else if (typeof children === 'string' || typeof children === 'number') {
    renderText(root, children, marker, suspended);
  } else if (children == null || typeof children === 'boolean') {
    //
  } else if ('type' in children) {
    renderNode(
      boundary,
      root,
      children,
      renderChildren,
      marker,
      suspended,
    );
  } else if ('derive' in children) {
    renderDerived(
      boundary,
      root,
      children,
      renderChildren,
      marker,
      suspended,
    );
  } else {
    renderRef(
      boundary,
      root,
      children,
      renderChildren,
      marker,
      suspended,
    );
  }
}
