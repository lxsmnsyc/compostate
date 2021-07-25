import { EffectCleanup } from 'compostate';
import { VNode } from '../types';
import { Marker } from '../dom';
import renderArray from './render-array';
import { Boundary, InternalShallowReactive, Lazy } from './types';
import renderText from './render-text';
import renderRef from './render-ref';
import renderNode from './render-node';
import renderDerived from './render-derived';
import { NO_OP } from './utils';

export default function renderChildren(
  boundary: Boundary,
  root: HTMLElement,
  children: VNode,
  marker: Lazy<Marker | null> = null,
  suspended: InternalShallowReactive<boolean | undefined> = false,
): EffectCleanup {
  if (Array.isArray(children)) {
    return renderArray(
      boundary,
      root,
      children,
      renderChildren,
      marker,
      suspended,
    );
  }
  if (typeof children === 'string' || typeof children === 'number') {
    return renderText(boundary, root, children, marker, suspended);
  }
  if (children == null || typeof children === 'boolean') {
    return NO_OP;
  }
  if ('type' in children) {
    return renderNode(
      boundary,
      root,
      children,
      renderChildren,
      marker,
      suspended,
    );
  }
  if ('derive' in children) {
    return renderDerived(
      boundary,
      root,
      children,
      renderChildren,
      marker,
      suspended,
    );
  }

  // Reactive VNode
  return renderRef(
    boundary,
    root,
    children,
    renderChildren,
    marker,
    suspended,
  );
}
