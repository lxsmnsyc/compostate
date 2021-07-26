import { effect, EffectCleanup } from 'compostate';
import { PortalProps } from '../../core';
import { derived } from '../../reactivity';
import { Reactive } from '../../types';

export default function renderPortalNode(
  props: Reactive<PortalProps>,
): EffectCleanup {
  if (props.target instanceof HTMLElement) {
    return renderChildren(
      props.target,
      props.children,
    );
  }
  const el = props.target;
  if ('derive' in el) {
    return derived(() => (
      renderChildren(
        el.derive(),
        props.children,
      )
    ));
  }
  return derived(() => (
    renderChildren(
      el.value,
      props.children,
    )
  ));
}
