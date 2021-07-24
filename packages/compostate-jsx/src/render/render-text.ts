import { EffectCleanup } from 'compostate';
import { createText, Marker } from '../dom';
import { Boundary, InternalShallowReactive, Lazy } from './types';
import { watchMarkerForNode } from './watch-marker';

export default function renderText(
  boundary: Boundary,
  root: HTMLElement,
  children: string | number,
  marker: Lazy<Marker | null> = null,
  suspended: InternalShallowReactive<boolean | undefined> = false,
): EffectCleanup {
  const node = createText(`${children}`);

  return watchMarkerForNode(root, marker, node, suspended, boundary.error);
}
