import {
  Ref, EffectCleanup, effect, isReactive, computed,
} from 'compostate';
import { Marker, createMarker } from '../dom';
import { setupErrorBoundary } from '../error-boundary';
import { ShallowReactive, VNode } from '../types';
import { Boundary, RenderChildren } from './types';
import { watchMarkerForMarker } from './watch-marker';

export default function renderArray(
  boundary: Boundary,
  root: HTMLElement,
  children: VNode[],
  renderChild: RenderChildren,
  marker: ShallowReactive<Marker | null> = null,
  suspended: Ref<boolean | undefined> | boolean | undefined = false,
): EffectCleanup {
  return effect(() => {
    // Bridge error boundary across untrack
    setupErrorBoundary(boundary.error);

    const markers: Marker[] = [];

    for (let i = 0; i < children.length; i += 1) {
      // Create a marker for each child
      const childMarker = createMarker();

      watchMarkerForMarker(root, marker, childMarker);

      markers[i] = childMarker;
    }

    for (let i = 0; i < children.length; i += 1) {
      const child = isReactive(children)
        ? computed(() => children[i])
        : children[i];

      // Render the child
      renderChild(
        boundary,
        root,
        // In case that the child comes from a reactive array
        child,
        markers[i],
        suspended,
      );
    }
  });
}
