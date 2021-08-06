import {
  batchCleanup,
  Cleanup,
  onCleanup,
  Ref,
  ref,
  track,
  createRoot,
  untrack,
  captureError,
} from 'compostate';
import { ForProps } from '../../special';
import { derived } from '../../reactivity';
import { Reactive, VNode } from '../../types';
import {
  Boundary,
} from '../types';

interface MemoryItem {
  node: VNode;
  position: Ref<number>;
  cleanup: Cleanup;
}

type EachTransform<T, R> = (item: T, position: Ref<number>) => R;

export default function renderForNode<T>(
  boundary: Boundary,
  props: Reactive<ForProps<T>>,
): VNode {
  const handleError = captureError();

  const memory: any[] = [];

  const memoryMap = new Map<any, MemoryItem[]>();

  const { each } = props;

  function getNode(index: number, item: any) {
    const position = ref(index);
    let currentCleanup: Cleanup;

    function getEach(transform: EachTransform<T, VNode>) {
      return createRoot(() => {
        try {
          let node: VNode;
          currentCleanup?.();
          currentCleanup = batchCleanup(() => {
            node = transform(item, position);
          });
          return node;
        } catch (error) {
          handleError(error);
          return undefined;
        }
      });
    }

    function getItem() {
      if (typeof each === 'function') {
        return getEach(each);
      }
      if ('derive' in each) {
        return derived(() => getEach(each.derive()));
      }
      return derived(() => getEach(each.value));
    }

    return {
      position,
      node: getItem(),
      cleanup: () => {
        currentCleanup?.();
      },
    };
  }

  onCleanup(() => {
    memoryMap.forEach((items) => {
      items.forEach((item) => {
        item.cleanup();
      });
    });
  });

  return derived(() => {
    let tracked: any[];
    const origin = props.in;
    if ('value' in origin) {
      tracked = origin.value;
    } else if ('derive' in origin) {
      tracked = origin.derive();
    } else {
      tracked = track(origin);
    }

    return untrack(() => {
      // Shortcut for empty tracked array
      if (tracked.length === 0) {
        memoryMap.forEach((items) => {
          items.forEach((item) => {
            item.cleanup();
          });
        });
        memoryMap.clear();
        // Empty the memory
        memory.length = 0;

        return [];
      }
      if (memory.length === 0) {
        const children: VNode = [];
        for (let i = 0; i < tracked.length; i += 1) {
          const item = tracked[i];
          const occurence = memoryMap.get(item);
          const node = getNode(i, item);
          if (occurence) {
            occurence.push(node);
          } else {
            memoryMap.set(item, [node]);
          }
          memory[i] = item;
          children[i] = node.node;
        }
        return children;
      }
      const children: VNode = [];
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
            children[i] = currentItem.node;
          } else {
            const node = getNode(i, item);
            occurence[currentOccurence] = node;
            children[i] = node.node;
          }
          flagged.add(occurence[currentOccurence]);
          occurences.set(item, currentOccurence + 1);
        } else {
          const node = getNode(i, item);
          memoryMap.set(item, [node]);
          occurences.set(item, 0);

          flagged.add(node);
          children[i] = node.node;
        }
        memory[i] = item;
      }
      occurences.clear();
      new Map(memoryMap).forEach((items, index) => {
        const newItems: MemoryItem[] = [];
        items.forEach((item) => {
          if (flagged.has(item)) {
            newItems.push(item);
          } else {
            item.cleanup();
          }
        });
        memoryMap.set(index, newItems);
      });
      return children;
    });
  });
}
