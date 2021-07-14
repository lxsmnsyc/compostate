import {
  Ref,
} from 'compostate';
import {
  VNode,
  Reactive,
  WithChildren,
  VComponent,
  Attributes,
  BaseProps,
  VElement,
} from './types';
import { DOMAttributes } from './types/dom';
import { HTMLAttributes, CompostateHTML } from './types/html';
import { SVGAttributes, CompostateSVG } from './types/svg';

export function c<P extends HTMLAttributes<T>, T extends HTMLElement>(
  type: (keyof CompostateHTML) | Ref<keyof CompostateHTML>,
  props: Reactive<P>,
  ...children: VNode[]
): VElement;
export function c<P extends SVGAttributes<T>, T extends SVGElement>(
  type: (keyof CompostateSVG) | Ref<keyof CompostateSVG>,
  props: Reactive<P>,
  ...children: VNode[]
): VElement;
export function c<P extends DOMAttributes<T>, T extends Element>(
  type: string | Ref<string>,
  props: Reactive<P>,
  ...children: VNode[]
): VElement;
export function c<P extends WithChildren>(
  type: null | Ref<null>,
  props: Reactive<Attributes & P>,
  ...children: VNode[]
): VElement;
export function c<P>(
  type: VComponent<P> | Ref<VComponent<P>>,
  props: Reactive<Attributes & P>,
  ...children: VNode[]
): VElement;
export function c<P extends BaseProps<P>>(
  type: string | Ref<string> | VComponent<P> | Ref<VComponent<P>> | null | Ref<null>,
  props: Reactive<P>,
  ...children: VNode[]
): VElement {
  return {
    type,
    props: {
      ...props,
      children: [
        ...(props?.children ?? []),
        ...children,
      ],
    },
  };
}

export function Fragment(props: WithChildren): VElement {
  return c(null, {
    children: props.children,
  });
}
