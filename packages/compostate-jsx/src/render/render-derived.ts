import { effect } from 'compostate';
import { Marker } from '../dom';
import { Derived } from '../reactivity';
import { VNode } from '../types';
import {
  Boundary,
  InternalShallowReactive,
  Lazy,
  RenderChildren,
} from './types';

export default function renderDerived(
  boundary: Boundary,
  root: HTMLElement,
  children: Derived<VNode>,
  renderChildren: RenderChildren,
  marker: Lazy<Marker | null> = null,
  suspended: InternalShallowReactive<boolean | undefined> = false,
): void {
  effect(() => {
    renderChildren(
      boundary,
      root,
      children.derive(),
      marker,
      suspended,
    );
  });
}
