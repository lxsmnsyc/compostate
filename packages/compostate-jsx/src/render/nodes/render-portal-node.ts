import { effect } from 'compostate';
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
): void {
  if (props.target instanceof HTMLElement) {
    renderChildren(
      boundary,
      props.target,
      props.children,
      null,
      suspended,
    );
  } else {
    const el = props.target;
    if ('derive' in el) {
      effect(() => (
        renderChildren(
          boundary,
          el.derive(),
          props.children,
          null,
          suspended,
        )
      ));
    } else {
      effect(() => (
        renderChildren(
          boundary,
          el.value,
          props.children,
          null,
          suspended,
        )
      ));
    }
  }
}
