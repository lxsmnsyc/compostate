import {
  isReactive,
} from 'compostate';
import { Marker, createMarker } from '../dom';
import { derived } from '../reactivity';
import { VNode } from '../types';
import {
  Boundary,
  InternalShallowReactive,
  Lazy,
  RenderChildren,
} from './types';
import { watchMarkerForMarker } from './watch-marker';

export default function renderArray(
  boundary: Boundary,
  root: HTMLElement,
  children: VNode[],
  renderChild: RenderChildren,
  marker: Lazy<Marker | null> = null,
  suspended: InternalShallowReactive<boolean | undefined> = false,
): void {
  for (let i = 0; i < children.length; i += 1) {
    // Create a marker for each child
    const childMarker = createMarker();

    watchMarkerForMarker(root, marker, childMarker);

    const child = isReactive(children)
      ? derived(() => children[i])
      : children[i];

    // Render the child
    renderChild(
      boundary,
      root,
      // In case that the child comes from a reactive array
      child,
      childMarker,
      suspended,
    );
  }
}
