import {
  effect,
  EffectCleanup,
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
): EffectCleanup {
  // This contains all of the tracked
  // resource instances that were suspended
  const resources = reactive<Set<Resource<any>>>(new Set());

  // Track the resource size and set the value
  // of suspend to false when the resource size
  // becomes zero (no suspended resources)
  let suspend: Lazy<boolean>;
  if (typeof suspended === 'function') {
    suspend = () => suspended() || track(resources).size > 0;
  } else if (typeof suspended === 'object') {
    suspend = () => suspended.value || track(resources).size > 0;
  } else if (suspended) {
    suspend = true;
  } else {
    suspend = () => track(resources).size > 0;
  }

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
  let suspendChildren: Lazy<boolean>;

  if (typeof suspend === 'function') {
    // Weird TS behavior
    const suspendDerive = suspend;
    suspendChildren = () => !suspendDerive();
  } else {
    suspendChildren = !suspend;
  }

  const cleanups = [
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
    }),
    watchMarkerForMarker(root, marker, fallbackBranch, boundary.error),
    watchMarkerForMarker(root, marker, childrenBranch, boundary.error),
    // Render fallback
    renderChildren(
      boundary,
      root,
      props.fallback,
      fallbackBranch,
      suspendChildren,
    ),
    renderChildren(
      {
        ...boundary,
        suspense: currentSuspense,
      },
      root,
      props.children,
      childrenBranch,
      // Forward the suspend state
      suspend,
    ),
  ];

  return () => {
    cleanups.forEach((cleanup) => {
      cleanup();
    });
  };
}
