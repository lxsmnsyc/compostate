import { effect, isReactive } from 'compostate';
import { VNode } from '../types';
import { createMarker, createText, Marker } from '../dom';
import { watchMarkerForMarker, watchMarkerForNode } from './watch-marker';
import { derived } from '../reactivity';
import { Boundary, Lazy } from './types';

export default function renderChildren(
  boundary: Boundary,
  root: Node,
  children: VNode,
  previous: VNode,
  marker: Lazy<Marker | null> = null,
): void {
  if (Array.isArray(children)) {
    for (let i = 0; i < children.length; i += 1) {
      const childMarker = createMarker();
      watchMarkerForMarker(root, marker, childMarker, boundary.error);
      const child = isReactive(children)
        ? derived(() => children[i])
        : children[i];
      renderChildren(boundary, root, child, previous, childMarker);
    }
  } else if (typeof children === 'number' || typeof children === 'string') {
    const node = createText(`${children}`);
    watchMarkerForNode(root, marker, node, boundary.suspense?.suspend);
  } else if (typeof children === 'boolean' || children == null) {
    // no-op
  } else if (children instanceof Node) {
    watchMarkerForNode(root, marker, children, boundary.suspense?.suspend);
  } else if ('value' in children) {
    let previousChildren: VNode;
    effect(() => {
      const newChildren = children.value;
      renderChildren(boundary, root, newChildren, previousChildren, marker);
      previousChildren = newChildren;
    });
  } else if ('derive' in children) {
    let previousChildren: VNode;
    effect(() => {
      const newChildren = children.derive();
      renderChildren(boundary, root, newChildren, previousChildren, marker);
      previousChildren = newChildren;
    });
  } else {
    watchMarkerForMarker(root, marker, children, boundary.error);
  }
}
