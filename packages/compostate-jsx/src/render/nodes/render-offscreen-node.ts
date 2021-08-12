import {
  Derived,
  derived,
  evalDerived,
  isDerived,
} from '../../reactivity';
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

  if (mount === true || mount === false) {
    normalizedMount = () => mount as boolean;
  } else if (isDerived(mount)) {
    normalizedMount = () => !!evalDerived(mount);
  } else if (mount == null) {
    normalizedMount = () => false;
  } else {
    normalizedMount = () => !!mount.value;
  }

  let suspendChildren: Lazy<boolean>;

  const currentSuspense = SUSPENSE;
  const suspended = currentSuspense?.suspend;

  if (typeof suspended === 'function') {
    suspendChildren = () => !suspended() && !normalizedMount();
  } else if (suspended === true) {
    suspendChildren = true;
  } else if (!suspended) {
    suspendChildren = () => !normalizedMount();
  } else {
    suspendChildren = () => !!suspended.value && !normalizedMount();
  }

  setSuspense({
    capture: currentSuspense?.capture,
    suspend: suspendChildren,
  });
  let result: Derived<VNode>;
  if (isDerived(render)) {
    result = derived(() => evalDerived(render)?.());
  } else if (typeof render === 'function') {
    result = derived(render);
  } else {
    result = derived(() => render.value?.());
  }
  setSuspense(currentSuspense);
  return result;
}
