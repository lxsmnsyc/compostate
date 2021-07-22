import { EffectCleanup, Ref } from 'compostate';
import { createText, Marker } from '../dom';
import { Lazy } from './types';
import { watchMarkerForNode } from './watch-marker';

export default function renderText(
  root: HTMLElement,
  children: string | number,
  marker: Lazy<Marker | null> = null,
  suspended: Ref<boolean | undefined> | boolean | undefined = false,
): EffectCleanup {
  const node = createText(`${children}`);

  return watchMarkerForNode(root, marker, node, suspended);
}
