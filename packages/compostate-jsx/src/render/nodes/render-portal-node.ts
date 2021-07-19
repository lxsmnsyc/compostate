import { Ref } from 'compostate';
import { PortalProps } from '../../core';
import { Marker } from '../../dom';
import { ShallowReactive } from '../../types';
import { Boundary, RenderChildren } from '../types';
import unwrapRef from '../unwrap-ref';

export default function renderPortalNode(
  boundary: Boundary,
  props: PortalProps,
  renderChildren: RenderChildren,
  marker: ShallowReactive<Marker | null> = null,
  suspended: Ref<boolean> | boolean = false,
): void {
  renderChildren(
    boundary,
    unwrapRef(props.target),
    props.children,
    marker,
    suspended,
  );
}
