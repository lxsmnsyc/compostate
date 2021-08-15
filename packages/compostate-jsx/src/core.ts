import renderCore from './render/render-core';
import {
  VNode,
  Reactive,
  VComponent,
  Attributes,
  BaseProps,
  VConstructor,
} from './types';
import { DOMAttributes } from './types/dom';
import { HTMLAttributes, CompostateHTML } from './types/html';
import { SVGAttributes, CompostateSVG } from './types/svg';

export function c<P extends HTMLAttributes<T>, T extends HTMLElement>(
  type: keyof CompostateHTML,
  props: Reactive<P> | null,
  ...children: VNode[]
): VNode;
export function c<P extends SVGAttributes<T>, T extends SVGElement>(
  type: keyof CompostateSVG,
  props: Reactive<P> | null,
  ...children: VNode[]
): VNode;
export function c<P extends DOMAttributes<T>, T extends Element>(
  type: string,
  props: Reactive<P> | null,
  ...children: VNode[]
): VNode;
export function c<P>(
  type: VComponent<P>,
  props: Reactive<Attributes & P> | null,
  ...children: VNode[]
): VNode;
export function c<P extends BaseProps<P>>(
  type: VConstructor,
  props: Reactive<P> | null,
  ...children: VNode[]
): VNode {
  return renderCore(type, props, children);
}
