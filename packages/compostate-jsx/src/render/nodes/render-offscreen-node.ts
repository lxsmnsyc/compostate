import { derived, evalDerived } from '../../reactivity';
import { OffscreenProps } from '../../special';
import { setSuspense, SUSPENSE } from '../../suspense';
import { Derived, Reactive, VNode } from '../../types';
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
      normalizedMount = () => !!evalDerived(mount);
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

  setSuspense({
    capture: currentSuspense?.capture,
    suspend: suspendChildren,
  });
  let result: Derived<VNode>;
  if ('value' in render) {
    result = derived(() => render.value?.());
  } else if ('derive' in render) {
    result = derived(() => evalDerived<OffscreenProps['render']>(render)?.());
  } else {
    result = derived(render);
  }
  setSuspense(currentSuspense);
  return result;
}
