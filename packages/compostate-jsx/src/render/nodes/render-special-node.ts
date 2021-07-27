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
} from '../../special';
import {
  VFor,
  VFragment,
  VNode,
  VOffscreen,
  VPortal,
  VSuspense,
} from '../../types';
import renderForNode from './render-for-node';
import renderOffscreenNode from './render-offscreen-node';
import renderPortalNode from './render-portal-node';
import renderSuspenseNode from './render-suspense-node';

export type SpecialNode =
  | { constructor: VFragment, props: FragmentProps, children: VNode[] }
  | { constructor: VFor, props: ForProps<any>, children: VNode[] }
  | { constructor: VSuspense, props: SuspenseProps, children: VNode[] }
  | { constructor: VPortal, props: PortalProps, children: VNode[] }
  | { constructor: VOffscreen, props: OffscreenProps, children: VNode[] }

export default function renderSpecialNode(
  node: SpecialNode,
): VNode {
  switch (node.constructor) {
    case Fragment:
      return [
        ...(node.props.children ?? []),
        ...node.children,
      ];
    case Suspense:
      return renderSuspenseNode(
        node.props,
      );
    case Offscreen:
      return renderOffscreenNode(
        node.props,
      );
    case Portal:
      return renderPortalNode(
        node.props,
      );
    case For:
      return renderForNode(
        node.props,
      );
    default:
      return undefined;
  }
}
