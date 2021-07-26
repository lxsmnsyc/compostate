import { derived } from '../reactivity';
import { VNode, VReactiveConstructor } from '../types';
import renderComponentNode from './nodes/render-component-node';
import renderHostNode from './nodes/render-host-node';
import renderSpecialNode from './nodes/render-special-node';

export default function renderCore<P>(
  type: VReactiveConstructor,
  props: P,
  children: VNode[],
): VNode {
  if (typeof type === 'object') {
    if ('derive' in type) {
      return derived(() => renderCore(
        type.derive(),
        props,
        children,
      ));
    }
    return derived(() => renderCore(
      type.value,
      props,
      children,
    ));
  }
  if (typeof type === 'function') {
    return renderComponentNode(
      type,
      props,
      children,
    );
  }
  if (typeof type === 'number') {
    return renderSpecialNode(
      type,
      props,
      children,
    );
  }
  return renderHostNode(
    type,
    props,
    children,
  );
}
