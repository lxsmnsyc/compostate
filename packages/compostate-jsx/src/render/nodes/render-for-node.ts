import { isReactive, track } from 'compostate';
import { derived, mapArray } from '../../reactivity';
import { ForProps } from '../../special';
import { Reactive, VNode } from '../../types';

export default function renderForNode<T>(
  props: Reactive<ForProps<T>>,
): VNode {
  const { each, in: inArray } = props;
  return mapArray(
    derived(() => {
      if ('derive' in inArray) {
        return inArray.derive();
      }
      if (Array.isArray(inArray)) {
        if (isReactive(inArray)) {
          return track(inArray);
        }
        return inArray;
      }
      return inArray.value;
    }),
    derived(() => {
      if ('derive' in each) {
        return each.derive();
      }
      if (typeof each === 'function') {
        return each;
      }
      return each.value;
    }),
  );
}
