import {
  reactive,
  Resource,
  track,
  watch,
} from 'compostate';
import { SuspenseProps } from '../../special';
import { Reactive, VNode } from '../../types';
import {
  Lazy,
} from '../types';
import { setSuspense, SUSPENSE } from '../../suspense';
import { derived, evalDerived } from '../../reactivity';

export default function renderSuspenseNode(
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

  const currentSuspense = SUSPENSE;
  const suspended = currentSuspense?.suspend;

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

  watch(() => track(resources), (value) => {
    const copy = new Set(value);
    if (copy.size) {
      for (const resource of copy) {
        if (resource.status === 'success') {
          resources.delete(resource);
        } else if (resource.status === 'failure') {
          resources.delete(resource);

          // Forward the error to the error boundary.
          throw resource.value;
        }
      }
    }
  });

  const { fallback, render } = props;
  let renderFallback: VNode;

  if (fallback) {
    setSuspense({
      capture: currentSuspense?.capture,
      suspend: suspendFallback,
    });
    if ('value' in fallback) {
      renderFallback = derived(() => fallback.value?.());
    } else if ('derive' in fallback) {
      renderFallback = derived(() => evalDerived<SuspenseProps['fallback']>(fallback)?.());
    } else {
      renderFallback = derived(fallback);
    }
    setSuspense(currentSuspense);
  }

  let renderContent: VNode;

  if (render) {
    setSuspense({
      capture,
      suspend: suspendChildren,
    });
    if ('value' in render) {
      renderContent = derived(() => render.value?.());
    } else if ('derive' in render) {
      renderContent = derived(() => evalDerived<SuspenseProps['render']>(render)?.());
    } else {
      renderContent = derived(render);
    }
    setSuspense(currentSuspense);
  }

  return [
    renderFallback,
    renderContent,
  ];
}
