import { effect } from 'compostate';
import { derived } from '../../reactivity';
import { PortalProps } from '../../special';
import { Reactive, ShallowReactive, VNode } from '../../types';
import renderChildren from '../render-children';
import { Boundary } from '../types';

function runPortalNodeRender(
  boundary: Boundary,
  target: Node,
  render: ShallowReactive<PortalProps['render']>,
): void {
  if (render == null) {
    // no-op
  } else if ('derive' in render) {
    effect(() => {
      const internalRender = render.derive();
      renderChildren(
        boundary,
        target,
        derived(() => internalRender?.()),
        null,
        null,
      );
    });
  } else if (typeof render === 'function') {
    effect(() => {
      renderChildren(
        boundary,
        target,
        derived(() => render()),
        null,
        null,
      );
    });
  } else {
    effect(() => {
      renderChildren(
        boundary,
        target,
        derived(() => render.value?.()),
        null,
        null,
      );
    });
  }
}

export default function renderPortalNode(
  boundary: Boundary,
  props: Reactive<PortalProps>,
): VNode {
  if (props.target instanceof HTMLElement) {
    runPortalNodeRender(
      boundary,
      props.target,
      props.render,
    );
    return undefined;
  }
  const el = props.target;
  if ('derive' in el) {
    effect(() => {
      runPortalNodeRender(
        boundary,
        el.derive(),
        props.render,
      );
    });
    return undefined;
  }
  effect(() => {
    runPortalNodeRender(
      boundary,
      el.value,
      props.render,
    );
  });
  return undefined;
}
