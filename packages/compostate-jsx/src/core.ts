import {
  VNode,
  Reactive,
  WithChildren,
  VComponent,
  Attributes,
  BaseProps,
  VElement,
  VFragment,
  VConstructor,
  ShallowReactive,
  VSuspense,
} from './types';
import { DOMAttributes } from './types/dom';
import { HTMLAttributes, CompostateHTML } from './types/html';
import { SVGAttributes, CompostateSVG } from './types/svg';

export function c<P extends HTMLAttributes<T>, T extends HTMLElement>(
  type: ShallowReactive<keyof CompostateHTML>,
  props: Reactive<P>,
  ...children: VNode[]
): VElement;
export function c<P extends SVGAttributes<T>, T extends SVGElement>(
  type: ShallowReactive<keyof CompostateSVG>,
  props: Reactive<P>,
  ...children: VNode[]
): VElement;
export function c<P extends DOMAttributes<T>, T extends Element>(
  type: ShallowReactive<string>,
  props: Reactive<P>,
  ...children: VNode[]
): VElement;
export function c(
  type: ShallowReactive<VFragment>,
  props: Reactive<Attributes & WithChildren>,
  ...children: VNode[]
): VElement;
export function c(
  type: ShallowReactive<VSuspense>,
  props: Reactive<Attributes & SuspenseProps>,
  ...children: VNode[]
): VElement;
export function c<P>(
  type: ShallowReactive<VComponent<P>>,
  props: Reactive<Attributes & P>,
  ...children: VNode[]
): VElement;
export function c<P extends BaseProps<P>>(
  type: VConstructor,
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
  return c(1/* Fragment */, {
    children: props.children,
  });
}

export interface SuspenseProps {
  fallback: VNode;
  children?: VNode[];
}

export function Suspense(props: SuspenseProps): VElement {
  return c(2/* Suspense */, {
    fallback: props.fallback,
    children: props.children,
  });
}
