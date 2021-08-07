import { derived } from '../../reactivity';
import { OffscreenProps } from '../../special';
import { setSuspense, SUSPENSE } from '../../suspense';
import { Reactive, VNode } from '../../types';
import {
  Lazy,
} from '../types';

export default function renderOffscreenNode(
  props: Reactive<OffscreenProps>,
): VNode {
  const { render, mount } = props;

  if (!render) {
    return undefined;
  }

  let normalizedMount: () => boolean;

  if (typeof mount === 'boolean') {
    normalizedMount = () => mount;
  } else if (typeof mount === 'object') {
    if ('derive' in mount) {
      normalizedMount = () => !!mount.derive();
    } else {
      normalizedMount = () => !!mount.value;
    }
  } else {
    normalizedMount = () => false;
  }

  let suspendChildren: Lazy<boolean>;

  const currentSuspense = SUSPENSE;
  const suspended = currentSuspense?.suspend;

  if (typeof suspended === 'function') {
    suspendChildren = () => !suspended() && !normalizedMount();
  } else if (typeof suspended === 'object') {
    suspendChildren = () => !!suspended.value && !normalizedMount();
  } else if (suspended) {
    suspendChildren = true;
  } else {
    suspendChildren = () => !normalizedMount();
  }

  return derived(() => {
    const parentSuspense = SUSPENSE;
    setSuspense({
      capture: parentSuspense?.capture,
      suspend: suspendChildren,
    });
    try {
      if ('value' in render) {
        return render.value?.();
      }
      if ('derive' in render) {
        return render.derive()?.();
      }
      return render();
    } finally {
      setSuspense(parentSuspense);
    }
  });
}
