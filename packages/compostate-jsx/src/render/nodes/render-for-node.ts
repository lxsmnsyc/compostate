import {
  computed,
  effect,
  EffectCleanup,
  Ref,
  ref,
  track,
  untrack,
} from 'compostate';
import { ForProps } from '../../core';
import { createMarker, Marker } from '../../dom';
import { ShallowReactive } from '../../types';
import { Boundary, RenderChildren } from '../types';
import unwrapRef from '../unwrap-ref';
import { watchMarkerForMarker } from '../watch-marker';

interface MemoryItem {
  cleanup: EffectCleanup;
  position: Ref<number>;
}

export default function renderForNode<T>(
  boundary: Boundary,
  root: HTMLElement,
  props: ForProps<T>,
  renderChildren: RenderChildren,
  marker: ShallowReactive<Marker | null> = null,
  suspended: Ref<boolean | undefined> | boolean | undefined = false,
): void {
  // The memoized array based on the source array
  const memory: any[] = [];

  const memoryMap = new Map<any, MemoryItem[]>();

  // Markers for the child position
  const markers: Marker[] = [];
  // Lifecycles of markers
  const markersLifecycle: EffectCleanup[] = [];

  effect(() => {
    // Track the given array
    const tracked = track(unwrapRef(props.in));

    // Expand markers if the tracked array has suffix inserts
    untrack(() => {
      // for (let i = tracked.length; i < markers.length; i += 1) {
      //   markersLifecycle[i]();
      //   delete markers[i];
      // }
      for (let i = markers.length; i < tracked.length; i += 1) {
        markers[i] = createMarker();
        markersLifecycle[i] = untrack(() => (
          watchMarkerForMarker(root, marker, markers[i])
        ));
      }
    });
    // Untrack for un-intended tracking
    untrack(() => {
      function getNode(index: number) {
        const position = ref(index);
        return {
          position,
          cleanup: untrack(() => (
            renderChildren(
              boundary,
              root,
              // Reactively track changes
              // on the produced children
              computed(() => (
                unwrapRef(props.each)(
                  untrack(() => tracked[index]),
                  position,
                )
              )),
              // Track marker positions
              computed(() => markers[position.value]),
              suspended,
            )
          )),
        };
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
        const occurences = new Map<any, number>();
        for (let i = 0; i < tracked.length; i += 1) {
          const item = tracked[i];
          const occurence = memoryMap.get(item);

          if (occurence) {
            const currentOccurence = (occurences.get(item) ?? 0) + 1;
            occurence[currentOccurence] = getNode(i);
            occurences.set(item, currentOccurence);
          } else {
            memoryMap.set(item, [getNode(i)]);
            occurences.set(item, 0);
          }
          memory[i] = item;
        }
        occurences.clear();
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
              occurence[currentOccurence] = getNode(i);
            }
            flagged.add(occurence[currentOccurence]);
            occurences.set(item, currentOccurence + 1);
          } else {
            const node = getNode(i);
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
  });

  effect(() => () => {
    memoryMap.forEach((items) => {
      items.forEach((item) => {
        item.cleanup();
      });
    });
    memoryMap.clear();
    markersLifecycle.forEach((cleanup) => {
      cleanup();
    });
  });
}
