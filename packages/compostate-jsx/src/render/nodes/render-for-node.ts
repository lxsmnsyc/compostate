import { mapArray } from '../../reactivity';
import { ForProps } from '../../special';
import { Reactive, VNode } from '../../types';

export default function renderForNode<T>(
  props: Reactive<ForProps<T>>,
): VNode {
  const { each, in: inArray } = props;
  return mapArray(
    inArray,
    each,
  );
}
