import { derived } from '../reactivity';
import { VNode, VReactiveConstructor, VSpecialConstructor } from '../types';
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
      return derived(() => renderCore(type.derive() as any, props, children));
    }
    return derived(() => renderCore(type.value as any, props, children));
  }
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
      {
        ...fauxProps,
        children: [
          ...(fauxProps.children ?? []),
          ...children,
        ],
      } as any,
    );
  }
  return renderHostNode(
    type,
    {
      ...fauxProps,
      children: [
        ...(fauxProps.children ?? []),
        ...children,
      ],
    } as any,
  );
}
