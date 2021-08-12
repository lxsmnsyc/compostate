import { derived, evalDerived, isDerived } from '../reactivity';
import { VNode, VReactiveConstructor, VSpecialConstructor } from '../types';
import renderComponentNode from './nodes/render-component-node';
import renderHostNode from './nodes/render-host-node';
import renderSpecialNode from './nodes/render-special-node';

const objAssign = Object.assign;

export default function renderCore<P>(
  type: VReactiveConstructor,
  props: P,
  children: VNode[],
): VNode {
  const fauxProps = props ?? {};
  if (typeof type === 'number') {
    return renderSpecialNode({
      constructor: type as unknown as VSpecialConstructor,
      props: fauxProps as any,
      children,
    });
  }
  if (typeof type === 'function') {
    return renderComponentNode(
      type,
      // eslint-disable-next-line prefer-object-spread
      objAssign({}, fauxProps, {
        children: [
          ...(fauxProps.children ?? []),
          ...children,
        ],
      }),
    );
  }
  if (typeof type === 'string') {
    return renderHostNode(
      type,
      // eslint-disable-next-line prefer-object-spread
      objAssign({}, fauxProps, {
        children: [
          ...(fauxProps.children ?? []),
          ...children,
        ],
      }),
    );
  }
  if (isDerived(type)) {
    return derived(() => renderCore(evalDerived(type), props, children));
  }
  return derived(() => renderCore(type.value, props, children));
}
