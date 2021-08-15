import { VConstructor, VNode } from '../types';
import renderComponentNode from './nodes/render-component-node';
import renderHostNode from './nodes/render-host-node';

const objAssign = Object.assign;

export default function renderCore<P>(
  type: VConstructor,
  props: P,
  children: VNode[],
): VNode {
  const fauxProps = props ?? {};
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
