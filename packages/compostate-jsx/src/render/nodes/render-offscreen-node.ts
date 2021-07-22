import { computed, EffectCleanup, Ref } from 'compostate';
import { OffscreenProps } from '../../core';
import { createMarker, Marker } from '../../dom';
import { Reactive } from '../../types';
import { Boundary, Lazy, RenderChildren } from '../types';
import { watchMarkerForMarker } from '../watch-marker';

export default function renderOffscreenNode(
  boundary: Boundary,
  root: HTMLElement,
  props: Reactive<OffscreenProps>,
  renderChildren: RenderChildren,
  marker: Lazy<Marker | null> = null,
  suspended: Ref<boolean | undefined> | boolean | undefined = false,
): EffectCleanup {
  const offscreenMarker = createMarker();

  const cleanups = [
    watchMarkerForMarker(root, marker, offscreenMarker, boundary.error),
    (() => {
      if (typeof suspended === 'object') {
        if (typeof props.mount === 'object') {
          const mountRef = props.mount;
          return renderChildren(
            boundary,
            root,
            props.children,
            offscreenMarker,
            // Forward the suspend state
            computed(() => suspended.value || !mountRef.value),
          );
        }
        if (props.mount) {
          return renderChildren(
            boundary,
            root,
            props.children,
            offscreenMarker,
            // Forward the suspend state
            suspended,
          );
        }
        return renderChildren(
          boundary,
          root,
          props.children,
          offscreenMarker,
          // Forward the suspend state
          true,
        );
      }
      if (typeof props.mount === 'object') {
        const mountRef = props.mount;
        if (suspended) {
          return renderChildren(
            boundary,
            root,
            props.children,
            offscreenMarker,
            // Forward the suspend state
            true,
          );
        }
        return renderChildren(
          boundary,
          root,
          props.children,
          offscreenMarker,
          mountRef,
        );
      }
      if (props.mount) {
        return renderChildren(
          boundary,
          root,
          props.children,
          offscreenMarker,
          // Forward the suspend state
          suspended,
        );
      }
      return renderChildren(
        boundary,
        root,
        props.children,
        offscreenMarker,
        // Forward the suspend state
        true,
      );
    })(),
  ];

  return () => {
    cleanups.forEach((cleanup) => {
      cleanup();
    });
  };
}
