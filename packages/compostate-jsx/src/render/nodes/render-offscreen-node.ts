import { computed, Ref } from 'compostate';
import { OffscreenProps } from '../../core';
import { createMarker, Marker } from '../../dom';
import { Reactive, ShallowReactive } from '../../types';
import { Boundary, RenderChildren } from '../types';
import { watchMarkerForMarker } from '../watch-marker';

export default function renderOffscreenNode(
  boundary: Boundary,
  root: HTMLElement,
  props: Reactive<OffscreenProps>,
  renderChildren: RenderChildren,
  marker: ShallowReactive<Marker | null> = null,
  suspended: Ref<boolean | undefined> | boolean | undefined = false,
): void {
  const offscreenMarker = createMarker();

  watchMarkerForMarker(root, marker, offscreenMarker);

  if (typeof suspended === 'object') {
    if (typeof props.mount === 'object') {
      const mountRef = props.mount;
      renderChildren(
        boundary,
        root,
        props.children,
        offscreenMarker,
        // Forward the suspend state
        computed(() => suspended.value || !mountRef.value),
      );
    } else if (props.mount) {
      renderChildren(
        boundary,
        root,
        props.children,
        offscreenMarker,
        // Forward the suspend state
        suspended,
      );
    } else {
      renderChildren(
        boundary,
        root,
        props.children,
        offscreenMarker,
        // Forward the suspend state
        true,
      );
    }
  } else if (typeof props.mount === 'object') {
    const mountRef = props.mount;
    if (suspended) {
      renderChildren(
        boundary,
        root,
        props.children,
        offscreenMarker,
        // Forward the suspend state
        true,
      );
    } else {
      renderChildren(
        boundary,
        root,
        props.children,
        offscreenMarker,
        mountRef,
      );
    }
  } else if (props.mount) {
    renderChildren(
      boundary,
      root,
      props.children,
      offscreenMarker,
      // Forward the suspend state
      suspended,
    );
  } else {
    renderChildren(
      boundary,
      root,
      props.children,
      offscreenMarker,
      // Forward the suspend state
      true,
    );
  }
}
