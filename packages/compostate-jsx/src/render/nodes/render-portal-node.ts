import { effect } from 'compostate';
import { derived, evalDerived } from '../../reactivity';
import { PortalProps } from '../../special';
import { Reactive, ShallowReactive, VNode } from '../../types';
import renderChildren from '../render-children';

function runPortalNodeRender(
  target: Node,
  render: ShallowReactive<PortalProps['render']>,
): void {
  if (render == null) {
    // no-op
  } else if ('derive' in render) {
    effect(() => {
      const internalRender = evalDerived(render);
      renderChildren(
        target,
        derived(() => internalRender?.()),
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
    effect(() => {
      renderChildren(
        target,
        derived(() => render.value?.()),
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
  if ('derive' in el) {
    effect(() => {
      runPortalNodeRender(
        evalDerived(el),
        props.render,
      );
    });
    return undefined;
  }
  effect(() => {
    runPortalNodeRender(
      el.value,
      props.render,
    );
  });
  return undefined;
}
