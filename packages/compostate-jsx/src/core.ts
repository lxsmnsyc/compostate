import { Ref } from 'compostate';
import {
  VNode,
  Reactive,
  VComponent,
  Attributes,
  BaseProps,
  VElement,
  VFragment,
  VConstructor,
  ShallowReactive,
  VSuspense,
  VPortal,
  VOffscreen,
  VFor,
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
  props: Reactive<Attributes & FragmentProps>,
  ...children: VNode[]
): VElement;
export function c(
  type: ShallowReactive<VSuspense>,
  props: Reactive<Attributes & SuspenseProps>,
  ...children: VNode[]
): VElement;
export function c(
  type: ShallowReactive<VOffscreen>,
  props: Reactive<Attributes & OffscreenProps>,
  ...children: VNode[]
): VElement;
export function c(
  type: ShallowReactive<VPortal>,
  props: Reactive<Attributes & PortalProps>,
  ...children: VNode[]
): VElement;
export function c<T>(
  type: ShallowReactive<VFor>,
  props: Reactive<Attributes & ForProps<T>>,
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

export interface FragmentProps {
  children?: VNode[];
}

export interface SuspenseProps {
  fallback: VNode;
  children?: VNode[];
}

export interface PortalProps {
  target: HTMLElement;
  children?: VNode[];
}

export interface OffscreenProps {
  mount?: boolean;
  children?: VNode[];
}

export interface ForProps<T> {
  in: T[];
  each: (item: T, index: Ref<number>) => VNode;
}

export const Fragment: VFragment = 1;
export const Suspense: VSuspense = 2;
export const Offscreen: VOffscreen = 3;
export const Portal: VPortal = 4;
export const For: VFor = 5;

// Considerations

// export interface ErrorBoundaryProps {
//   onError?: (error: Error, reset: () => void) => void;
//   fallback?: VNode;
//   children?: VNode;
// }

// export interface ProviderProps<T> {
//   provider: Provider<T>;
//   value: T;
// }

// export const ErrorBoundary: VErrorBoundary = 255;
// export const Provider: VProvider = 254;
