import { effect, Cleanup } from 'compostate';
import { PortalProps } from '../../core';
import { Reactive } from '../../types';
import {
  Boundary,
  InternalShallowReactive,
  RenderChildren,
} from '../types';

export default function renderPortalNode(
  boundary: Boundary,
  props: Reactive<PortalProps>,
  renderChildren: RenderChildren,
  suspended: InternalShallowReactive<boolean | undefined> = false,
): Cleanup {
  if (props.target instanceof HTMLElement) {
    return renderChildren(
      boundary,
      props.target,
      props.children,
      null,
      suspended,
    );
  }
  const el = props.target;
  if ('derive' in el) {
    return effect(() => (
      renderChildren(
        boundary,
        el.derive(),
        props.children,
        null,
        suspended,
      )
    ));
  }
  return effect(() => (
    renderChildren(
      boundary,
      el.value,
      props.children,
      null,
      suspended,
    )
  ));
}
