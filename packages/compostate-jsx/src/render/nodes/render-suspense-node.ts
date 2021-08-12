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
import { derived, evalDerived, isDerived } from '../../reactivity';

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
  } else if (suspended === true) {
    suspendFallback = true;
    suspendChildren = true;
  } else if (!suspended) {
    suspendFallback = suspend;
    suspendChildren = () => !suspend();
  } else {
    suspendFallback = () => !!suspended.value && suspend();
    suspendChildren = () => !!suspended.value && !suspend();
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
    if (isDerived(fallback)) {
      renderFallback = derived(() => evalDerived(fallback)?.());
    } else if (typeof fallback === 'function') {
      renderFallback = derived(fallback);
    } else {
      renderFallback = derived(() => fallback.value?.());
    }
    setSuspense(currentSuspense);
  }

  let renderContent: VNode;

  if (render) {
    setSuspense({
      capture,
      suspend: suspendChildren,
    });
    if (isDerived(render)) {
      renderContent = derived(() => evalDerived(render)?.());
    } else if (typeof render === 'function') {
      renderContent = derived(render);
    } else {
      renderContent = derived(() => render.value?.());
    }
    setSuspense(currentSuspense);
  }

  return [
    renderFallback,
    renderContent,
  ];
}
