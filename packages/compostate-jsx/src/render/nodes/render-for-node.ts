import { mapArray } from '../../reactivity';
import { ForProps } from '../../special';
import { Reactive, VNode } from '../../types';

export default function renderForNode<T>(
  props: Reactive<ForProps<T>>,
): VNode {
  return mapArray(
    props.in,
    props.each,
  );
}
