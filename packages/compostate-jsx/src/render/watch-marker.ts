/* eslint-disable no-param-reassign */
import { EffectCleanup, effect, Ref } from 'compostate';
import { Marker, insert, remove } from '../dom';
import { ShallowReactive } from '../types';
import unwrapRef from './unwrap-ref';

export function watchMarkerForMarker(
  root: HTMLElement,
  parent: ShallowReactive<Marker | null>,
  child: Marker,
): EffectCleanup {
  let parentVersion: number | undefined;
  let previousParent: Marker | null = null;

  return effect(() => {
    // Insert new marker before the parent marker
    const actualParent = unwrapRef(parent);
    if (actualParent !== previousParent) {
      parentVersion = undefined;
      previousParent = actualParent;
    }
    if (actualParent) {
      if (parentVersion !== actualParent.version) {
        parentVersion = actualParent.version;
        insert(root, child.node, actualParent.node);
        child.version += 1;
      }
    } else {
      insert(root, child.node);
    }

    return () => {
      remove(child.node);
    };
  });
}

export function watchMarkerForNode(
  root: HTMLElement,
  parent: ShallowReactive<Marker | null>,
  child: Node,
  suspended: Ref<boolean> | boolean = false,
): EffectCleanup {
  let parentVersion: number | undefined;
  let previousParent: Marker | null = null;

  return effect(() => {
    // Do not insert node if the tree is suspended
    const actualParent = unwrapRef(parent);
    if (actualParent !== previousParent) {
      parentVersion = undefined;
      previousParent = actualParent;
    }
    if (!unwrapRef(suspended)) {
      if (actualParent) {
        // Check if the parent marker has changed position
        if (parentVersion !== actualParent.version) {
          parentVersion = actualParent.version;
          insert(root, child, actualParent.node);
        }
      } else {
        // No parent, just append child
        insert(root, child);
      }
    }

    return () => {
      remove(child);
    };
  });
}
