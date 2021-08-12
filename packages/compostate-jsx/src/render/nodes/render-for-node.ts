import {
  isReactive,
  track,
  Ref,
  map,
} from 'compostate';
import { derived, evalDerived, isDerived } from '../../reactivity';
import { ForProps } from '../../special';
import { Reactive, VNode } from '../../types';

export default function renderForNode<T>(
  props: Reactive<ForProps<T>>,
): VNode {
  const { in: list, each: mapFn } = props;

  let derivedList: () => T[];

  if (isDerived(list)) {
    derivedList = () => evalDerived(list);
  } else if (Array.isArray(list)) {
    if (isReactive(list)) {
      derivedList = () => track(list);
    } else {
      derivedList = () => list;
    }
  } else {
    derivedList = () => list.value;
  }

  let derivedMap: () => (v: T, i: Ref<number>) => VNode;

  if (isDerived(mapFn)) {
    derivedMap = () => evalDerived(mapFn);
  } else if (typeof mapFn === 'function') {
    derivedMap = () => mapFn;
  } else {
    derivedMap = () => mapFn.value;
  }

  return derived(map(
    derivedList,
    derivedMap,
  ));
}
