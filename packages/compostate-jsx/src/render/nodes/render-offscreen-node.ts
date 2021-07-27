import { Cleanup } from 'compostate';
import { OffscreenProps } from '../../core';
import { createMarker, Marker } from '../../dom';
import { Reactive } from '../../types';
import {
  Boundary,
  InternalShallowReactive,
  Lazy,
  RenderChildren,
} from '../types';
import { watchMarkerForMarker } from '../watch-marker';

export default function renderOffscreenNode(
  boundary: Boundary,
  root: HTMLElement,
  props: Reactive<OffscreenProps>,
  renderChildren: RenderChildren,
  marker: Lazy<Marker | null> = null,
  suspended: InternalShallowReactive<boolean | undefined> = false,
): Cleanup {
  const offscreenMarker = createMarker();

  const cleanups = [
    watchMarkerForMarker(root, marker, offscreenMarker, boundary.error),
    (() => {
      if (typeof suspended === 'object') {
        if (typeof props.mount === 'object') {
          const mountRef = props.mount;
          if ('derive' in mountRef) {
            return renderChildren(
              boundary,
              root,
              props.children,
              offscreenMarker,
              // Forward the suspend state
              () => suspended.value || !mountRef.derive(),
            );
          }
          return renderChildren(
            boundary,
            root,
            props.children,
            offscreenMarker,
            // Forward the suspend state
            () => suspended.value || !mountRef.value,
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
      if (typeof suspended === 'function') {
        if (typeof props.mount === 'object') {
          const mountRef = props.mount;
          if ('derive' in mountRef) {
            return renderChildren(
              boundary,
              root,
              props.children,
              offscreenMarker,
              // Forward the suspend state
              () => suspended() || !mountRef.derive(),
            );
          }
          return renderChildren(
            boundary,
            root,
            props.children,
            offscreenMarker,
            // Forward the suspend state
            () => suspended() || !mountRef.value,
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
          'derive' in mountRef ? mountRef.derive : mountRef,
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
