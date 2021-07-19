import { effect, Ref } from 'compostate';
import { PortalProps } from '../../core';
import { Marker } from '../../dom';
import { Reactive, ShallowReactive } from '../../types';
import { Boundary, RenderChildren } from '../types';

export default function renderPortalNode(
  boundary: Boundary,
  props: Reactive<PortalProps>,
  renderChildren: RenderChildren,
  marker: ShallowReactive<Marker | null> = null,
  suspended: Ref<boolean | undefined> | boolean | undefined = false,
): void {
  if (props.target instanceof HTMLElement) {
    renderChildren(
      boundary,
      props.target,
      props.children,
      marker,
      suspended,
    );
  } else {
    const el = props.target;
    effect(() => {
      renderChildren(
        boundary,
        el.value,
        props.children,
        marker,
        suspended,
      );
    });
  }
}
