import { effect, isReactive, watch } from 'compostate';
import { VNode } from '../types';
import { createMarker, createText, Marker } from '../dom';
import { watchMarkerForMarker, watchMarkerForNode } from './watch-marker';
import { derived } from '../reactivity';

export default function renderChildren(
  root: Node,
  children: VNode,
  marker: Marker | null = null,
): void {
  if (Array.isArray(children)) {
    for (let i = 0; i < children.length; i += 1) {
      const childMarker = createMarker();
      watchMarkerForMarker(root, marker, childMarker);
      const child = isReactive(children)
        ? derived(() => children[i])
        : children[i];
      renderChildren(root, child, childMarker);
    }
  } else if (typeof children === 'number' || typeof children === 'string') {
    const node = createText(`${children}`);
    watchMarkerForNode(root, marker, node);
  } else if (typeof children === 'boolean' || children == null) {
    // no-op
  } else if (children instanceof Node) {
    watchMarkerForNode(root, marker, children);
  } else if ('value' in children) {
    watch(
      children,
      () => {
        renderChildren(root, children.value, marker);
      },
      true,
    );
  } else if ('derive' in children) {
    effect(() => {
      renderChildren(root, children.derive(), marker);
    });
  } else {
    watchMarkerForMarker(root, marker, children);
  }
}
