/* eslint-disable no-param-reassign */
import { EffectCleanup, effect, Ref } from 'compostate';
import { Marker, insert, remove } from '../dom';
import { ShallowReactive } from '../types';
import { Lazy } from './types';

export function watchMarkerForMarker(
  root: HTMLElement,
  parent: Lazy<Marker | null>,
  child: Marker,
): EffectCleanup {
  let initialCall = true;
  if (parent) {
    let parentVersion: number | undefined;
    if (typeof parent === 'function') {
      let previousParent: Marker | null = null;

      return effect(() => {
        // Insert new marker before the parent marker
        const actualParent = parent();
        if (actualParent !== previousParent) {
          parentVersion = undefined;
          previousParent = actualParent;
        }
        if (actualParent) {
          if (parentVersion !== actualParent.version.value) {
            parentVersion = actualParent.version.value;
            insert(root, child.node, actualParent.node);
            if (!initialCall) {
              child.version.value += 1;
            }
          }
        } else {
          insert(root, child.node);
        }
        initialCall = false;

        return () => {
          remove(child.node);
        };
      });
    }
    return effect(() => {
      if (parent) {
        if (parentVersion !== parent.version.value) {
          parentVersion = parent.version.value;
          insert(root, child.node, parent.node);
          if (!initialCall) {
            child.version.value += 1;
          }
        }
      } else {
        insert(root, child.node);
      }
      initialCall = false;

      return () => {
        remove(child.node);
      };
    });
  }
  return effect(() => {
    insert(root, child.node);
    return () => {
      remove(child.node);
    };
  });
}

export function watchMarkerForNode(
  root: HTMLElement,
  parent: Lazy<Marker | null>,
  child: Node,
  suspended: ShallowReactive<boolean | undefined> = false,
): EffectCleanup {
  if (parent) {
    let parentVersion: number | undefined;
    if (typeof parent === 'function') {
      let previousParent: Marker | null = null;
      if (typeof suspended === 'object') {
        return effect(() => {
          // Do not insert node if the tree is suspended
          const actualParent = parent();
          if (actualParent !== previousParent) {
            parentVersion = undefined;
            previousParent = actualParent;
          }
          if (suspended.value) {
            if (actualParent) {
              // Check if the parent marker has changed position
              if (parentVersion !== actualParent.version.value) {
                parentVersion = actualParent.version.value;
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
      if (suspended) {
        return () => { /* no-op */ };
      }
      return effect(() => {
        const actualParent = parent();
        if (actualParent !== previousParent) {
          parentVersion = undefined;
          previousParent = actualParent;
        }
        if (actualParent) {
          // Check if the parent marker has changed position
          if (parentVersion !== actualParent.version.value) {
            parentVersion = actualParent.version.value;
            insert(root, child, actualParent.node);
          }
        } else {
          // No parent, just append child
          insert(root, child);
        }

        return () => {
          remove(child);
        };
      });
    }
    if (typeof suspended === 'object') {
      return effect(() => {
        if (suspended.value && parentVersion !== parent.version.value) {
          parentVersion = parent.version.value;
          insert(root, child, parent.node);
        }

        return () => {
          remove(child);
        };
      });
    }
    if (suspended) {
      return () => { /* no-op */ };
    }
    return effect(() => {
      if (parentVersion !== parent.version.value) {
        parentVersion = parent.version.value;
        insert(root, child, parent.node);
      }

      return () => {
        remove(child);
      };
    });
  }
  if (typeof suspended === 'object') {
    return effect(() => {
      if (suspended.value) {
        insert(root, child);
      }
      return () => {
        remove(child);
      };
    });
  }
  if (suspended) {
    return () => { /* no-op */ };
  }
  return effect(() => {
    insert(root, child);

    return () => {
      remove(child);
    };
  });
}
