import { effect, EffectCleanup, Ref } from 'compostate';
import { PortalProps } from '../../core';
import { Marker } from '../../dom';
import { Reactive } from '../../types';
import { Boundary, Lazy, RenderChildren } from '../types';

export default function renderPortalNode(
  boundary: Boundary,
  props: Reactive<PortalProps>,
  renderChildren: RenderChildren,
  marker: Lazy<Marker | null> = null,
  suspended: Ref<boolean | undefined> | boolean | undefined = false,
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
  return effect(() => {
    renderChildren(
      boundary,
      el.value,
      props.children,
      marker,
      suspended,
    );
  });
}
