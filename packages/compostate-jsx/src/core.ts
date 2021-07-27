import { Ref } from 'compostate';
import { derived } from './reactivity';
import renderComponentNode from './render/nodes/render-component-node';
import renderHostNode from './render/nodes/render-host-node';
import renderSpecialNode from './render/nodes/render-special-node';
import {
  FragmentProps,
  SuspenseProps,
  OffscreenProps,
  PortalProps,
  ForProps,
} from './special';
import {
  VNode,
  Reactive,
  VComponent,
  Attributes,
  BaseProps,
  VFragment,
  ShallowReactive,
  VSuspense,
  VPortal,
  VOffscreen,
  VFor,
  VReactiveConstructor,
  VSpecialConstructor,
} from './types';
import { DOMAttributes } from './types/dom';
import { HTMLAttributes, CompostateHTML } from './types/html';
import { SVGAttributes, CompostateSVG } from './types/svg';

export function c<P extends HTMLAttributes<T>, T extends HTMLElement>(
  type: ShallowReactive<keyof CompostateHTML>,
  props: Reactive<P>,
  ...children: VNode[]
): VNode;
export function c<P extends SVGAttributes<T>, T extends SVGElement>(
  type: ShallowReactive<keyof CompostateSVG>,
  props: Reactive<P>,
  ...children: VNode[]
): VNode;
export function c<P extends DOMAttributes<T>, T extends Element>(
  type: ShallowReactive<string>,
  props: Reactive<P>,
  ...children: VNode[]
): VNode;
export function c(
  type: ShallowReactive<VFragment>,
  props: Reactive<Attributes & FragmentProps>,
  ...children: VNode[]
): VNode;
export function c(
  type: ShallowReactive<VSuspense>,
  props: Reactive<Attributes & SuspenseProps>,
  ...children: VNode[]
): VNode;
export function c(
  type: ShallowReactive<VOffscreen>,
  props: Reactive<Attributes & OffscreenProps>,
  ...children: VNode[]
): VNode;
export function c(
  type: ShallowReactive<VPortal>,
  props: Reactive<Attributes & PortalProps>,
  ...children: VNode[]
): VNode;
export function c<T>(
  type: ShallowReactive<VFor>,
  props: Reactive<Attributes & ForProps<T>>,
  ...children: VNode[]
): VNode;
export function c<P>(
  type: ShallowReactive<VComponent<P>>,
  props: Reactive<Attributes & P>,
  ...children: VNode[]
): VNode;
export function c<P extends BaseProps<P>>(
  type: VReactiveConstructor,
  props: Reactive<P>,
  ...children: VNode[]
): VNode {
  if (typeof type === 'object') {
    if ('derive' in type) {
      return derived(() => c(type.derive() as any, props, ...children));
    }
    return derived(() => c(type.value as any, props, ...children));
  }
  if (typeof type === 'number') {
    return renderSpecialNode({
      constructor: type as unknown as VSpecialConstructor,
      props: props as any,
      children,
    });
  }
  if (typeof type === 'function') {
    return renderComponentNode(
      type,
      props,
    );
  }
  return renderHostNode(
    type,
    props,
  );
}
