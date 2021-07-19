import { computed, Ref } from 'compostate';
import { OffscreenProps } from '../../core';
import { createMarker, Marker } from '../../dom';
import { ShallowReactive } from '../../types';
import { Boundary, RenderChildren } from '../types';
import unwrapRef from '../unwrap-ref';
import { watchMarkerForMarker } from '../watch-marker';

export default function renderOffscreenNode(
  boundary: Boundary,
  root: HTMLElement,
  props: OffscreenProps,
  renderChildren: RenderChildren,
  marker: ShallowReactive<Marker | null> = null,
  suspended: Ref<boolean> | boolean = false,
): void {
  const offscreenMarker = createMarker();

  const suspend = computed(() => (
    unwrapRef(suspended) || !unwrapRef(props.mount)
  ));

  watchMarkerForMarker(root, marker, offscreenMarker);

  renderChildren(
    boundary,
    root,
    props.children,
    offscreenMarker,
    // Forward the suspend state
    suspend,
  );
}
