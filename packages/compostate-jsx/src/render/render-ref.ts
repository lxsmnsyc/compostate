import { effect, EffectCleanup, Ref } from 'compostate';
import { Marker } from '../dom';
import { setupErrorBoundary } from '../error-boundary';
import { ShallowReactive, VNode } from '../types';
import { Boundary, RenderChildren } from './types';
import unwrapRef from './unwrap-ref';

export default function renderRef(
  boundary: Boundary,
  root: HTMLElement,
  children: Ref<VNode>,
  renderChildren: RenderChildren,
  marker: ShallowReactive<Marker | null> = null,
  suspended: Ref<boolean> | boolean = false,
): EffectCleanup {
  return effect(() => {
    setupErrorBoundary(boundary.error);

    renderChildren(
      boundary,
      root,
      unwrapRef(children),
      marker,
      suspended,
    );
  });
}
