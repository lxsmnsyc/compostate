import {
  For,
  ForProps,
  Fragment,
  FragmentProps,
  Offscreen,
  OffscreenProps,
  Portal,
  PortalProps,
  Suspense,
  SuspenseProps,
} from '../../core';
import { Marker } from '../../dom';
import {
  VFor,
  VFragment,
  VOffscreen,
  VPortal,
  VSuspense,
} from '../../types';
import {
  Boundary,
  InternalShallowReactive,
  Lazy,
  RenderChildren,
} from '../types';
import renderForNode from './render-for-node';
import renderFragmentNode from './render-fragment-node';
import renderOffscreenNode from './render-offscreen-node';
import renderPortalNode from './render-portal-node';
import renderSuspenseNode from './render-suspense-node';

export type SpecialNode =
  | { constructor: VFragment, props: FragmentProps }
  | { constructor: VFor, props: ForProps<any> }
  | { constructor: VSuspense, props: SuspenseProps }
  | { constructor: VPortal, props: PortalProps }
  | { constructor: VOffscreen, props: OffscreenProps }

export default function renderSpecialNode(
  boundary: Boundary,
  root: HTMLElement,
  node: SpecialNode,
  renderChildren: RenderChildren,
  marker: Lazy<Marker | null> = null,
  suspended: InternalShallowReactive<boolean | undefined> = false,
): void {
  switch (node.constructor) {
    case Fragment:
      renderFragmentNode(
        boundary,
        root,
        node.props,
        renderChildren,
        marker,
        suspended,
      );
      break;
    case Suspense:
      renderSuspenseNode(
        boundary,
        root,
        node.props,
        renderChildren,
        marker,
        suspended,
      );
      break;
    case Offscreen:
      renderOffscreenNode(
        boundary,
        root,
        node.props,
        renderChildren,
        marker,
        suspended,
      );
      break;
    case Portal:
      renderPortalNode(
        boundary,
        node.props,
        renderChildren,
        suspended,
      );
      break;
    case For:
      renderForNode(
        boundary,
        root,
        node.props,
        renderChildren,
        marker,
        suspended,
      );
      break;
    default:
      break;
  }
}
