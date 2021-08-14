import { effect, watch } from 'compostate';
import { derived, evalDerived, isDerived } from '../../reactivity';
import { PortalProps } from '../../special';
import { Reactive, ShallowReactive, VNode } from '../../types';
import renderChildren from '../render-children';

function runPortalNodeRender(
  target: Node,
  render: ShallowReactive<PortalProps['render']>,
): void {
  if (render == null) {
    // no-op
  } else if (isDerived(render)) {
    watch(() => evalDerived(render), (value) => {
      renderChildren(
        target,
        derived(() => value?.()),
        null,
        null,
      );
    });
  } else if (typeof render === 'function') {
    effect(() => {
      renderChildren(
        target,
        derived(() => render()),
        null,
        null,
      );
    });
  } else {
    watch(() => render.value, (value) => {
      renderChildren(
        target,
        derived(() => value?.()),
        null,
        null,
      );
    });
  }
}

export default function renderPortalNode(
  props: Reactive<PortalProps>,
): VNode {
  if (props.target instanceof HTMLElement) {
    runPortalNodeRender(
      props.target,
      props.render,
    );
    return undefined;
  }
  const el = props.target;
  if (isDerived(el)) {
    watch(() => evalDerived(el), (value) => {
      runPortalNodeRender(
        value,
        props.render,
      );
    });
    return undefined;
  }
  watch(() => el.value, (value) => {
    runPortalNodeRender(
      value,
      props.render,
    );
  });
  return undefined;
}
