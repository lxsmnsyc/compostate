/* eslint-disable no-param-reassign */
import { EffectCleanup, effect, untrack } from 'compostate';
import Context from '../context';
import { Marker, insert, remove } from '../dom';
import ErrorBoundary, { handleError } from '../error-boundary';
import { InternalShallowReactive, Lazy } from './types';

export const UNMOUNTING = new Context<boolean | undefined>();

export function watchMarkerForMarker(
  root: HTMLElement,
  parent: Lazy<Marker | null>,
  child: Marker,
  boundary?: ErrorBoundary,
): EffectCleanup {
  let initialCall = true;
  let currentCleanup: EffectCleanup | undefined;
  if (parent) {
    let parentVersion: number | undefined;
    if (typeof parent === 'function') {
      let previousParent: Marker | null = null;

      currentCleanup = effect(() => {
        // Insert new marker before the parent marker
        const actualParent = parent();
        if (actualParent !== previousParent) {
          parentVersion = undefined;
          previousParent = actualParent;
        }
        if (actualParent) {
          const newVersion = actualParent.version.value;
          if (parentVersion !== newVersion) {
            parentVersion = newVersion;
            insert(root, child.node, actualParent.node);
            if (!initialCall) {
              child.version.value = untrack(() => child.version.value) + 1;
            }
          }
        } else {
          insert(root, child.node);
        }
        initialCall = false;
      }, {
        onError(error) {
          handleError(boundary, error);
        },
      });
    } else {
      currentCleanup = effect(() => {
        if (parent) {
          const newVersion = parent.version.value;
          if (parentVersion !== newVersion) {
            parentVersion = newVersion;
            insert(root, child.node, parent.node);
            if (!initialCall) {
              child.version.value = untrack(() => child.version.value) + 1;
            }
          }
        } else {
          insert(root, child.node);
        }
        initialCall = false;
      }, {
        onError(error) {
          handleError(boundary, error);
        },
      });
    }
  } else {
    insert(root, child.node);
  }
  return () => {
    currentCleanup?.();
    if (!UNMOUNTING.getContext()) {
      remove(child.node);
    }
  };
}

export function watchMarkerForNode(
  root: HTMLElement,
  parent: Lazy<Marker | null>,
  child: Node,
  suspended: InternalShallowReactive<boolean | undefined> = false,
  boundary?: ErrorBoundary,
): EffectCleanup {
  let currentCleanup: EffectCleanup | undefined;
  if (parent) {
    let parentVersion: number | undefined;
    if (typeof parent === 'function') {
      let previousParent: Marker | null = null;
      if (typeof suspended === 'function') {
        currentCleanup = effect(() => {
          // Do not insert node if the tree is suspended
          const actualParent = parent();
          if (actualParent !== previousParent) {
            parentVersion = undefined;
            previousParent = actualParent;
          }
          if (suspended()) {
            if (actualParent) {
              const newVersion = actualParent.version.value;
              // Check if the parent marker has changed position
              if (parentVersion !== newVersion) {
                parentVersion = newVersion;
                insert(root, child, actualParent.node);
              }
            } else {
              // No parent, just append child
              insert(root, child);
            }
          }
        }, {
          onError(error) {
            handleError(boundary, error);
          },
        });
      } else if (typeof suspended === 'object') {
        currentCleanup = effect(() => {
          // Do not insert node if the tree is suspended
          const actualParent = parent();
          if (actualParent !== previousParent) {
            parentVersion = undefined;
            previousParent = actualParent;
          }
          if (suspended.value) {
            if (actualParent) {
              const newVersion = actualParent.version.value;
              // Check if the parent marker has changed position
              if (parentVersion !== newVersion) {
                parentVersion = newVersion;
                insert(root, child, actualParent.node);
              }
            } else {
              // No parent, just append child
              insert(root, child);
            }
          }
        }, {
          onError(error) {
            handleError(boundary, error);
          },
        });
      } else if (suspended) {
        currentCleanup = () => { /* no-op */ };
      } else {
        currentCleanup = effect(() => {
          const actualParent = parent();
          if (actualParent !== previousParent) {
            parentVersion = undefined;
            previousParent = actualParent;
          }
          if (actualParent) {
            const newVersion = actualParent.version.value;
            // Check if the parent marker has changed position
            if (parentVersion !== newVersion) {
              parentVersion = newVersion;
              insert(root, child, actualParent.node);
            }
          } else {
            // No parent, just append child
            insert(root, child);
          }
        }, {
          onError(error) {
            handleError(boundary, error);
          },
        });
      }
    } else if (typeof suspended === 'function') {
      currentCleanup = effect(() => {
        const newVersion = parent.version.value;
        if (suspended() && parentVersion !== newVersion) {
          parentVersion = newVersion;
          insert(root, child, parent.node);
        }
      }, {
        onError(error) {
          handleError(boundary, error);
        },
      });
    } else if (typeof suspended === 'object') {
      currentCleanup = effect(() => {
        const newVersion = parent.version.value;
        if (suspended.value && parentVersion !== newVersion) {
          parentVersion = newVersion;
          insert(root, child, parent.node);
        }
      }, {
        onError(error) {
          handleError(boundary, error);
        },
      });
    } else if (suspended) {
      currentCleanup = () => { /* no-op */ };
    } else {
      currentCleanup = effect(() => {
        const newVersion = parent.version.value;
        if (parentVersion !== newVersion) {
          parentVersion = newVersion;
          insert(root, child, parent.node);
        }
      }, {
        onError(error) {
          handleError(boundary, error);
        },
      });
    }
  } else if (typeof suspended === 'object') {
    currentCleanup = effect(() => {
      if (suspended.value) {
        insert(root, child);
      }
    }, {
      onError(error) {
        handleError(boundary, error);
      },
    });
  } else if (suspended) {
    currentCleanup = () => { /* no-op */ };
  } else {
    insert(root, child);
  }

  return () => {
    currentCleanup?.();
    if (!UNMOUNTING.getContext()) {
      remove(child);
    }
  };
}
