import {
  batchCleanup,
  effect,
  reactive,
  Resource,
  track,
} from 'compostate';
import { SuspenseProps } from '../../core';
import { createMarker, Marker } from '../../dom';
import {
  Boundary,
  InternalShallowReactive,
  Lazy,
  RenderChildren,
} from '../types';
import { watchMarkerForMarker } from '../watch-marker';

export default function renderSuspenseNode(
  boundary: Boundary,
  root: HTMLElement,
  props: SuspenseProps,
  renderChildren: RenderChildren,
  marker: Lazy<Marker | null> = null,
  suspended: InternalShallowReactive<boolean | undefined> = false,
): void {
  batchCleanup(() => {
    // This contains all of the tracked
    // resource instances that were suspended
    const resources = reactive<Set<Resource<any>>>(new Set());

    // Track the resource size and set the value
    // of suspend to false when the resource size
    // becomes zero (no suspended resources)
    const suspend = () => track(resources).size > 0;

    // Create a Suspense boundary instance.
    const capture = <T>(resource: Resource<T>) => {
      resources.add(resource);
    };

    const currentSuspense = {
      parent: boundary.suspense,
      capture,
    };

    // Create markers for the fallback and the
    // children branches
    const fallbackBranch = createMarker();
    const childrenBranch = createMarker();

    // Since the fallback branch
    // only renders when suspended
    // We make sure to flip the value
    // to consider DOM elements
    let suspendFallback: Lazy<boolean>;
    let suspendChildren: Lazy<boolean>;

    if (typeof suspended === 'function') {
      suspendFallback = () => !suspended() && suspend();
      suspendChildren = () => !suspended() && !suspend();
    } else if (typeof suspended === 'object') {
      suspendFallback = () => !!suspended.value && suspend();
      suspendChildren = () => !!suspended.value && !suspend();
    } else if (suspended) {
      suspendFallback = true;
      suspendChildren = true;
    } else {
      suspendFallback = suspend;
      suspendChildren = () => !suspend();
    }

    // Track the resources and remove all
    // failed an successful resource
    effect(() => {
      new Set(track(resources)).forEach((resource) => {
        if (resource.status === 'success') {
          resources.delete(resource);
        } else if (resource.status === 'failure') {
          resources.delete(resource);

          // Forward the error to the error boundary.
          throw resource.value;
        }
      });
    });
    watchMarkerForMarker(root, marker, fallbackBranch);
    watchMarkerForMarker(root, marker, childrenBranch);
    // Render fallback
    renderChildren(
      boundary,
      root,
      props.fallback,
      fallbackBranch,
      suspendFallback,
    );
    renderChildren(
      {
        ...boundary,
        suspense: currentSuspense,
      },
      root,
      props.children,
      childrenBranch,
      // Forward the suspend state
      suspendChildren,
    );
  });
}
