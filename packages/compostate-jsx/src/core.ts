import { effect, Ref } from 'compostate';
import { claimHydration, HYDRATION } from './hydration';
import { derived } from './reactivity';
import renderComponentNode from './render/nodes/render-component-node';
import renderHostNode from './render/nodes/render-host-node';
import renderSpecialNode, { SpecialNode } from './render/nodes/render-special-node';
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
  RefAttributes,
} from './types';
import { DOMAttributes } from './types/dom';
import { HTMLAttributes, CompostateHTML } from './types/html';
import { SVGAttributes, CompostateSVG } from './types/svg';

function renderChildren(
  root: Node,
  children: VNode,
  marker: Node | null = null,
): void {
  if (Array.isArray(children)) {
    children.forEach((child) => {
      const childMarker = document.createTextNode('');
      root.insertBefore(childMarker, marker);
      renderChildren(root, child, childMarker);
    });
  } else if (typeof children === 'number' || typeof children === 'string') {
    const node = document.createTextNode(`${children}`);
    root.insertBefore(node, marker);
    effect(() => () => {
      root.removeChild(node);
    });
  } else if (typeof children === 'boolean' || children == null) {
    // no-op
  } else if (children instanceof Node) {
    root.insertBefore(children, marker);
    effect(() => () => {
      root.removeChild(children);
    });
  } else if ('value' in children) {
    effect(() => {
      renderChildren(root, children.value, marker);
    });
  } else if ('derive' in children) {
    effect(() => {
      renderChildren(root, children.derive(), marker);
    });
  }
}

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

  const hydration = HYDRATION.getContext();
  const claim = hydration ? claimHydration(hydration) : null;
  let el = document.createElement(type);

  if (hydration) {
    if (claim) {
      if (claim.tagName !== type.toUpperCase()) {
        throw new Error(`Hydration mismatch. (Expected: ${type}, Received: ${claim.tagName})`);
      }
      el = claim as HTMLElement;
    } else {
      throw new Error(`Hydration mismatch. (Expected: ${type}, Received: null)`);
    }
  }

  Object.keys(props).forEach((key) => {
    // Ref handler
    if (key === 'ref') {
      const elRef = (props as RefAttributes<HTMLElement>).ref;
      if (elRef) {
        elRef.value = el;
      }
    // Children handler
    } else if (key === 'children') {
      renderChildren(el, props.children);
    } else {
      const rawProperty = props[key as keyof typeof props];
      if (typeof rawProperty === 'object') {
        if ('value' in rawProperty) {
          cleanups.push(
            watch(
              rawProperty,
              () => (
                applyHostProperty(boundary, el, key, rawProperty.value)
              ),
              true,
            ),
          );
        } else {
          effect(() => (
            applyHostProperty(boundary, el, key, rawProperty.derive())
          ));
        }
      } else {
        applyHostProperty(boundary, el, key, rawProperty); 
      }
    }
  });

  return el;
}

export interface FragmentProps {
  children?: VNode[];
}

export interface SuspenseProps {
  fallback: VNode;
  children?: () => VNode;
}

export interface PortalProps {
  target: HTMLElement;
  children: () => VNode;
}

export interface OffscreenProps {
  mount?: boolean;
  children?: () => VNode;
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
