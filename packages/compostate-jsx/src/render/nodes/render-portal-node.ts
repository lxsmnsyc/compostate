import { effect } from 'compostate';
import { PortalProps } from '../../special';
import { Reactive, VNode } from '../../types';
import renderChildren from '../render-children';
import { Boundary } from '../types';

export default function renderPortalNode(
  boundary: Boundary,
  props: Reactive<PortalProps>,
): VNode {
  if (props.target instanceof HTMLElement) {
    renderChildren(
      boundary,
      props.target,
      props.children,
      null,
      null,
    );
    return undefined;
  }
  const el = props.target;
  if ('derive' in el) {
    effect(() => (
      renderChildren(
        boundary,
        el.derive(),
        props.children,
        null,
        null,
      )
    ));
    return undefined;
  }
  effect(() => (
    renderChildren(
      boundary,
      el.value,
      props.children,
      null,
      null,
    )
  ));
  return undefined;
}
