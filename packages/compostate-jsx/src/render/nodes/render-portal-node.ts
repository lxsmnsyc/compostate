import { effect, EffectCleanup } from 'compostate';
import { PortalProps } from '../../core';
import { Marker } from '../../dom';
import { Reactive } from '../../types';
import {
  Boundary,
  InternalShallowReactive,
  Lazy,
  RenderChildren,
} from '../types';

export default function renderPortalNode(
  boundary: Boundary,
  props: Reactive<PortalProps>,
  renderChildren: RenderChildren,
  marker: Lazy<Marker | null> = null,
  suspended: InternalShallowReactive<boolean | undefined> = false,
): EffectCleanup {
  if (props.target instanceof HTMLElement) {
    return renderChildren(
      boundary,
      props.target,
      props.children,
      marker,
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
        marker,
        suspended,
      )
    ));
  }
  return effect(() => (
    renderChildren(
      boundary,
      el.value,
      props.children,
      marker,
      suspended,
    )
  ));
}
