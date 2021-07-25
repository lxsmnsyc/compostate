/* eslint-disable no-param-reassign */
import { EffectCleanup, effect, untrack, Ref } from 'compostate';
import Context from '../context';
import { Marker, insert, remove } from '../dom';
import ErrorBoundary, { handleError } from '../error-boundary';
import { InternalShallowReactive, Lazy } from './types';
import { NO_OP } from './utils';

export const UNMOUNTING = new Context<boolean | undefined>();

function watchNonLazyMarkerForMarker(
  root: HTMLElement,
  parent: Marker,
  child: Marker,
  boundary?: ErrorBoundary,
): EffectCleanup {
  let initialCall = true;
  let parentVersion: number | undefined;
  return effect(() => {
    const newVersion = parent.version.value;
    if (parentVersion !== newVersion) {
      parentVersion = newVersion;
      insert(root, child.node, parent.node);
      if (!initialCall) {
        child.version.value = untrack(() => child.version.value) + 1;
      }
    }
    initialCall = false;
  }, {
    onError(error) {
      handleError(boundary, error);
    },
  });
}

function watchLazyMarkerForMarker(
  root: HTMLElement,
  parent: () => Marker | null,
  child: Marker,
  boundary?: ErrorBoundary,
): EffectCleanup {
  let initialCall = true;
  let parentVersion: number | undefined;
  let previousParent: Marker | null = null;
  return effect(() => {
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
}

export function watchMarkerForMarker(
  root: HTMLElement,
  parent: Lazy<Marker | null>,
  child: Marker,
  boundary?: ErrorBoundary,
): EffectCleanup {
  let currentCleanup: EffectCleanup | undefined;
  if (parent) {
    if (typeof parent === 'function') {
      currentCleanup = watchLazyMarkerForMarker(root, parent, child, boundary);
    } else {
      currentCleanup = watchNonLazyMarkerForMarker(root, parent, child, boundary);
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

function watchLazyMarkerForNodeWithLazySuspend(
  root: HTMLElement,
  parent: () => Marker | null,
  child: Node,
  suspended: () => boolean | undefined,
  boundary?: ErrorBoundary,
): EffectCleanup {
  let parentVersion: number | undefined;
  let previousParent: Marker | null = null;
  return effect(() => {
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
}

function watchLazyMarkerForNodeWithRefSuspend(
  root: HTMLElement,
  parent: () => Marker | null,
  child: Node,
  suspended: Ref<boolean | undefined>,
  boundary?: ErrorBoundary,
): EffectCleanup {
  let parentVersion: number | undefined;
  let previousParent: Marker | null = null;
  return effect(() => {
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
}

function watchLazyMarkerForNode(
  root: HTMLElement,
  parent: () => Marker | null,
  child: Node,
  boundary?: ErrorBoundary,
): EffectCleanup {
  let parentVersion: number | undefined;
  let previousParent: Marker | null = null;
  return effect(() => {
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

function watchMarkerForNodeWithLazySuspend(
  root: HTMLElement,
  parent: Marker,
  child: Node,
  suspended: () => boolean | undefined,
  boundary?: ErrorBoundary,
): EffectCleanup {
  let parentVersion: number | undefined;
  return effect(() => {
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
}

function watchMarkerForNodeWithRefSuspend(
  root: HTMLElement,
  parent: Marker,
  child: Node,
  suspended: Ref<boolean | undefined>,
  boundary?: ErrorBoundary,
): EffectCleanup {
  let parentVersion: number | undefined;
  return effect(() => {
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
}

function watchActualMarkerForMarker(
  root: HTMLElement,
  parent: Marker,
  child: Node,
  boundary?: ErrorBoundary,
): EffectCleanup {
  let parentVersion: number | undefined;
  return effect(() => {
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

function watchNoMarkerForNodeWithRefSuspend(
  root: HTMLElement,
  child: Node,
  suspended: Ref<boolean | undefined>,
  boundary?: ErrorBoundary,
): EffectCleanup {
  return effect(() => {
    if (suspended.value) {
      insert(root, child);
    }
  }, {
    onError(error) {
      handleError(boundary, error);
    },
  });
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
    if (typeof parent === 'function') {
      if (typeof suspended === 'function') {
        currentCleanup = watchLazyMarkerForNodeWithLazySuspend(
          root,
          parent,
          child,
          suspended,
          boundary,
        );
      } else if (typeof suspended === 'object') {
        currentCleanup = watchLazyMarkerForNodeWithRefSuspend(
          root,
          parent,
          child,
          suspended,
          boundary,
        );
      } else if (suspended) {
        currentCleanup = NO_OP;
      } else {
        currentCleanup = watchLazyMarkerForNode(
          root,
          parent,
          child,
          boundary,
        );
      }
    } else if (typeof suspended === 'function') {
      currentCleanup = watchMarkerForNodeWithLazySuspend(
        root,
        parent,
        child,
        suspended,
        boundary,
      );
    } else if (typeof suspended === 'object') {
      currentCleanup = watchMarkerForNodeWithRefSuspend(
        root,
        parent,
        child,
        suspended,
        boundary,
      );
    } else if (suspended) {
      currentCleanup = NO_OP;
    } else {
      currentCleanup = watchActualMarkerForMarker(
        root,
        parent,
        child,
        boundary,
      );
    }
  } else if (typeof suspended === 'object') {
    currentCleanup = watchNoMarkerForNodeWithRefSuspend(
      root,
      child,
      suspended,
      boundary,
    );
  } else if (suspended) {
    currentCleanup = NO_OP;
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
