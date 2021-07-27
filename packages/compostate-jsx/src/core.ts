import {
  FragmentProps,
  SuspenseProps,
  OffscreenProps,
  PortalProps,
  ForProps,
} from './special';
import renderCore from './render/render-core';
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
} from './types';
import { DOMAttributes } from './types/dom';
import { HTMLAttributes, CompostateHTML } from './types/html';
import { SVGAttributes, CompostateSVG } from './types/svg';
import { Boundary } from './render/types';
import { SUSPENSE } from './suspense';
import { PROVIDER } from './provider';
import { ERROR_BOUNDARY } from './error-boundary';

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
  const boundary: Boundary = {
    suspense: SUSPENSE.getContext(),
    provider: PROVIDER.getContext(),
    error: ERROR_BOUNDARY.getContext(),
  };
  return renderCore(boundary, type, props, children);
}
