import { captureError } from 'compostate';
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
  const handleError = captureError();
  if (typeof type === 'object') {
    if ('derive' in type) {
      return derived(() => {
        try {
          return renderCore(boundary, type.derive() as any, props, children);
        } catch (error) {
          handleError(error);
          return undefined;
        }
      });
    }
    return derived(() => {
      try {
        return renderCore(boundary, type.value as any, props, children);
      } catch (error) {
        handleError(error);
        return undefined;
      }
    });
  }
  const fauxProps = props ?? {};
  if (typeof type === 'number') {
    return renderSpecialNode(boundary, {
      constructor: type as unknown as VSpecialConstructor,
      props: fauxProps as any,
      children,
    });
  }
  if (typeof type === 'function') {
    return renderComponentNode(
      boundary,
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
    boundary,
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
