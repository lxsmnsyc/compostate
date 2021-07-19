import { Ref } from 'compostate';
import { FragmentProps } from '../../core';
import { Marker } from '../../dom';
import { ShallowReactive } from '../../types';
import { Boundary, RenderChildren } from '../types';

export default function renderFragmentNode(
  boundary: Boundary,
  root: HTMLElement,
  props: FragmentProps,
  renderChildren: RenderChildren,
  marker: ShallowReactive<Marker | null> = null,
  suspended: Ref<boolean> | boolean = false,
): void {
  // Fragment renderer
  renderChildren(
    boundary,
    root,
    props.children,
    marker,
    suspended,
  );
}
