import { EffectCleanup, Ref } from 'compostate';
import { VNode, ShallowReactive } from '../types';
import { Marker } from '../dom';
import renderArray from './render-array';
import { Boundary, Lazy } from './types';
import renderText from './render-text';
import renderRef from './render-ref';
import renderNode from './render-node';

export default function renderChildren(
  boundary: Boundary,
  root: HTMLElement,
  children: VNode,
  marker: Lazy<Marker | null> = null,
  suspended: Ref<boolean | undefined> | boolean | undefined = false,
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
    return renderText(root, children, marker, suspended);
  }
  if (children == null || typeof children === 'boolean') {
    return () => { /* no-op */ };
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
