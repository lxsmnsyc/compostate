import { createText, Marker } from '../dom';
import { InternalShallowReactive, Lazy } from './types';
import { watchMarkerForNode } from './watch-marker';

export default function renderText(
  root: HTMLElement,
  children: string | number,
  marker: Lazy<Marker | null> = null,
  suspended: InternalShallowReactive<boolean | undefined> = false,
): void {
  const node = createText(`${children}`);
  watchMarkerForNode(root, marker, node, suspended);
}
