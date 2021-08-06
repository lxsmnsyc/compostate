import { captureError } from 'compostate';
import { PROVIDER } from '../../provider';
import { derived } from '../../reactivity';
import { OffscreenProps } from '../../special';
import { SUSPENSE } from '../../suspense';
import { Reactive, VNode } from '../../types';
import {
  Boundary,
  Lazy,
} from '../types';

export default function renderOffscreenNode(
  boundary: Boundary,
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

  const suspended = boundary.suspense?.suspend;

  if (typeof suspended === 'function') {
    suspendChildren = () => !suspended() && !normalizedMount();
  } else if (typeof suspended === 'object') {
    suspendChildren = () => !!suspended.value && !normalizedMount();
  } else if (suspended) {
    suspendChildren = true;
  } else {
    suspendChildren = () => !normalizedMount();
  }

  const handleError = captureError();

  return derived(() => {
    SUSPENSE.push({
      capture: boundary.suspense?.capture,
      suspend: suspendChildren,
    });
    PROVIDER.push(boundary.provider);
    try {
      if ('value' in render) {
        return render.value?.();
      }
      if ('derive' in render) {
        return render.derive()?.();
      }
      return render();
    } catch (error) {
      handleError(error);
      return undefined;
    } finally {
      PROVIDER.pop();
      SUSPENSE.pop();
    }
  });
}
