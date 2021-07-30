import {
  effect,
  reactive,
  Resource,
  track,
} from 'compostate';
import { SuspenseProps } from '../../special';
import { Reactive, VNode } from '../../types';
import {
  Boundary,
  Lazy,
} from '../types';
import { SUSPENSE } from '../../suspense';
import { derived } from '../../reactivity';
import { PROVIDER } from '../../provider';
import { ERROR_BOUNDARY } from '../../error-boundary';

export default function renderSuspenseNode(
  boundary: Boundary,
  props: Reactive<SuspenseProps>,
): VNode {
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

  // Since the fallback branch
  // only renders when suspended
  // We make sure to flip the value
  // to consider DOM elements
  let suspendFallback: Lazy<boolean>;
  let suspendChildren: Lazy<boolean>;

  const suspended = boundary.suspense?.suspend;

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

  const { fallback, render } = props;
  let renderFallback: VNode;

  if (fallback) {
    renderFallback = derived(() => {
      SUSPENSE.push({
        capture: boundary.suspense?.capture,
        suspend: suspendFallback,
      });
      PROVIDER.push(boundary.provider);
      ERROR_BOUNDARY.push(boundary.error);
      try {
        if ('value' in fallback) {
          return fallback.value?.();
        }
        if ('derive' in fallback) {
          return fallback.derive()?.();
        }
        return fallback();
      } finally {
        ERROR_BOUNDARY.pop();
        PROVIDER.pop();
        SUSPENSE.pop();
      }
    });
  }

  let renderContent: VNode;

  if (render) {
    renderContent = derived(() => {
      SUSPENSE.push({
        capture,
        suspend: suspendChildren,
      });
      PROVIDER.push(boundary.provider);
      ERROR_BOUNDARY.push(boundary.error);
      try {
        if ('value' in render) {
          return render.value?.();
        }
        if ('derive' in render) {
          return render.derive()?.();
        }
        return render();
      } finally {
        ERROR_BOUNDARY.pop();
        PROVIDER.pop();
        SUSPENSE.pop();
      }
    });
  }

  return [
    renderFallback,
    renderContent,
  ];
}
