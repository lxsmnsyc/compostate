import { derived } from '../reactivity';
import { VNode, VReactiveConstructor, VSpecialConstructor } from '../types';
import renderComponentNode from './nodes/render-component-node';
import renderHostNode from './nodes/render-host-node';
import renderSpecialNode from './nodes/render-special-node';
import { Boundary } from './types';

export default function renderCore<P>(
  boundary: Boundary,
  type: VReactiveConstructor,
  props: P,
  children: VNode[],
): VNode {
  if (typeof type === 'object') {
    if ('derive' in type) {
      return derived(() => renderCore(boundary, type.derive() as any, props, children));
    }
    return derived(() => renderCore(boundary, type.value as any, props, children));
  }
  if (typeof type === 'number') {
    return renderSpecialNode(boundary, {
      constructor: type as unknown as VSpecialConstructor,
      props: props as any,
      children,
    });
  }
  if (typeof type === 'function') {
    return renderComponentNode(
      boundary,
      type,
      props,
    );
  }
  return renderHostNode(
    boundary,
    type,
    props as any,
  );
}
