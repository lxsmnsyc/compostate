import { effect, EffectCleanup, Ref } from 'compostate';
import { Marker } from '../dom';
import { VNode } from '../types';
import {
  Boundary,
  InternalShallowReactive,
  Lazy,
  RenderChildren,
} from './types';

export default function renderRef(
  boundary: Boundary,
  root: HTMLElement,
  children: Ref<VNode>,
  renderChildren: RenderChildren,
  marker: Lazy<Marker | null> = null,
  suspended: InternalShallowReactive<boolean | undefined> = false,
): EffectCleanup {
  return effect(() => (
    renderChildren(
      boundary,
      root,
      children.value,
      marker,
      suspended,
    )
  ));
}
