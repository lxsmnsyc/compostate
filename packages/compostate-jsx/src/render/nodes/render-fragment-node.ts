import { EffectCleanup, Ref } from 'compostate';
import { FragmentProps } from '../../core';
import { Marker } from '../../dom';
import { Boundary, Lazy, RenderChildren } from '../types';

export default function renderFragmentNode(
  boundary: Boundary,
  root: HTMLElement,
  props: FragmentProps,
  renderChildren: RenderChildren,
  marker: Lazy<Marker | null> = null,
  suspended: Ref<boolean | undefined> | boolean | undefined = false,
): EffectCleanup {
  // Fragment renderer
  return renderChildren(
    boundary,
    root,
    props.children,
    marker,
    suspended,
  );
}
