import { PortalProps } from '../../special';
import { Reactive, VNode } from '../../types';
import renderChildren from '../render-children';
import { effect } from '../../../../compostate/dist/types';

export default function renderPortalNode(
  props: Reactive<PortalProps>,
): VNode {
  if (props.target instanceof HTMLElement) {
    renderChildren(
      props.target,
      props.children,
    );
    return undefined;
  }
  const el = props.target;
  if ('derive' in el) {
    effect(() => (
      renderChildren(
        el.derive(),
        props.children,
      )
    ));
    return undefined;
  }
  effect(() => (
    renderChildren(
      el.value,
      props.children,
    )
  ));
  return undefined;
}
