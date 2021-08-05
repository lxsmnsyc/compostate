import { batchCleanup } from 'compostate';
import { FragmentProps } from '../../core';
import { Marker } from '../../dom';
import {
  Boundary,
  InternalShallowReactive,
  Lazy,
  RenderChildren,
} from '../types';

export default function renderFragmentNode(
  boundary: Boundary,
  root: HTMLElement,
  props: FragmentProps,
  renderChildren: RenderChildren,
  marker: Lazy<Marker | null> = null,
  suspended: InternalShallowReactive<boolean | undefined> = false,
): void {
  batchCleanup(() => {
    // Fragment renderer
    renderChildren(
      boundary,
      root,
      props.children,
      marker,
      suspended,
    );
  });
}
