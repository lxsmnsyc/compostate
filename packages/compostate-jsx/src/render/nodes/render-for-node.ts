import {
  effect,
  EffectCleanup,
  Ref,
  ref,
  track,
  untrack,
} from 'compostate';
import { ForProps } from '../../core';
import { createMarker, Marker } from '../../dom';
import { handleError } from '../../error-boundary';
import { derived } from '../../reactivity';
import { Reactive } from '../../types';
import {
  Boundary,
  InternalShallowReactive,
  Lazy,
  RenderChildren,
} from '../types';
import { watchMarkerForMarker } from '../watch-marker';

interface MemoryItem {
  cleanup: EffectCleanup;
  position: Ref<number>;
}

export default function renderForNode<T>(
  boundary: Boundary,
  root: HTMLElement,
  props: Reactive<ForProps<T>>,
  renderChildren: RenderChildren,
  marker: Lazy<Marker | null> = null,
  suspended: InternalShallowReactive<boolean | undefined> = false,
): EffectCleanup {
  // The memoized array based on the source array
  const memory: any[] = [];

  const memoryMap = new Map<any, MemoryItem[]>();

  // Markers for the child position
  const markers: Marker[] = [];
  // Lifecycles of markers
  const markersLifecycle: EffectCleanup[] = [];

  function getNode(index: number, item: any) {
    const position = ref(index);
    const each = (() => {
      const factory = props.each;
      if ('value' in factory) {
        return derived(() => factory.value(item, position));
      }
      if ('derive' in factory) {
        return derived(() => factory.derive()(item, position));
      }
      return factory(item, position);
    })();
    return {
      position,
      cleanup: renderChildren(
        boundary,
        root,
        // Reactively track changes
        // on the produced children
        each,
        // Track marker positions
        () => markers[position.value],
        suspended,
      ),
    };
  }

  const cleanups = [
    effect(() => {
      let tracked: any[];
      const origin = props.in;
      if ('value' in origin) {
        tracked = origin.value;
      } else if ('derive' in origin) {
        tracked = origin.derive();
      } else {
        tracked = track(origin);
      }
      // Expand markers if the tracked array has suffix inserts
      untrack(() => {
        // for (let i = tracked.length; i < markers.length; i += 1) {
        //   markersLifecycle[i]();
        //   delete markers[i];
        // }
        for (let i = markers.length; i < tracked.length; i += 1) {
          markers[i] = createMarker();
          markersLifecycle[i] = watchMarkerForMarker(root, marker, markers[i], boundary.error);
        }
        // Shortcut for empty tracked array
        if (tracked.length === 0) {
          memoryMap.forEach((items) => {
            items.forEach((item) => {
              item.cleanup();
            });
          });
          memoryMap.clear();
          // Empty the memory
          memory.splice(0, memory.length);
        // Shortcut for inserts
        } else if (memory.length === 0) {
          for (let i = 0; i < tracked.length; i += 1) {
            const item = tracked[i];
            const occurence = memoryMap.get(item);

            if (occurence) {
              occurence.push(getNode(i, item));
            } else {
              memoryMap.set(item, [getNode(i, item)]);
            }
            memory[i] = item;
          }
        } else {
          const occurences = new Map<any, number>();
          const flagged = new Set<MemoryItem>();
          for (let i = 0; i < tracked.length; i += 1) {
            const item = tracked[i];
            // Get record from memory
            const occurence = memoryMap.get(item);

            if (occurence) {
              // Get the occurence
              const currentOccurence = occurences.get(item) ?? 0;
              const currentItem = occurence[currentOccurence];
              if (currentItem) {
                currentItem.position.value = i;
              } else {
                occurence[currentOccurence] = getNode(i, item);
              }
              flagged.add(occurence[currentOccurence]);
              occurences.set(item, currentOccurence + 1);
            } else {
              const node = getNode(i, item);
              memoryMap.set(item, [node]);
              occurences.set(item, 0);

              flagged.add(node);
            }
            memory[i] = item;
          }
          occurences.clear();
          new Map(memoryMap).forEach((items, index) => {
            const newItems: MemoryItem[] = [];
            items.forEach((item) => {
              if (!flagged.has(item)) {
                item.cleanup();
              } else {
                newItems.push(item);
              }
            });
            memoryMap.set(index, newItems);
          });
        }
      });

      return undefined;
    }, {
      onError(error) {
        handleError(boundary.error, error);
      },
    }),
    () => {
      memoryMap.forEach((items) => {
        items.forEach((item) => {
          item.cleanup();
        });
      });
      memoryMap.clear();
      markersLifecycle.forEach((cleanup) => {
        cleanup();
      });
    },
  ];

  return () => {
    cleanups.forEach((cleanup) => {
      cleanup();
    });
  };
}
