import { Ref } from 'compostate';
import { FragmentProps } from '../../core';
import { Marker } from '../../dom';
import { ShallowReactive } from '../../types';
import renderArray from '../render-array';
import { Boundary, RenderChildren } from '../types';

export default function renderFragmentNode(
  boundary: Boundary,
  root: HTMLElement,
  props: FragmentProps,
  renderChildren: RenderChildren,
  marker: ShallowReactive<Marker | null> = null,
  suspended: Ref<boolean | undefined> | boolean | undefined = false,
): void {
  // Fragment renderer
  if (props.children) {
    renderArray(
      boundary,
      root,
      props.children,
      renderChildren,
      marker,
      suspended,
    );
  }
}
