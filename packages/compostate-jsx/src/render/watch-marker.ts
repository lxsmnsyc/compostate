/* eslint-disable no-param-reassign */
import {
  effect,
  untrack,
  Ref,
  watch,
  onCleanup,
} from 'compostate';
import Context from '../context';
import { Marker, insert, remove } from '../dom';
import ErrorBoundary, { handleError } from '../error-boundary';
import { InternalShallowReactive, Lazy } from './types';

export const UNMOUNTING = new Context<boolean | undefined>();

function watchNonLazyMarkerForMarker(
  root: Node,
  parent: Marker,
  child: Marker,
): void {
  let initialCall = true;
  let parentVersion: number | undefined;
  watch(
    parent.version,
    () => {
      const newVersion = parent.version.value;
      if (parentVersion !== newVersion) {
        parentVersion = newVersion;
        insert(root, child.node, parent.node);
        if (!initialCall) {
          child.version.value = untrack(() => child.version.value) + 1;
        }
      }
      initialCall = false;
    },
    true,
  );
}

function watchLazyMarkerForMarker(
  root: Node,
  parent: () => Marker | null,
  child: Marker,
  boundary?: ErrorBoundary,
): void {
  let initialCall = true;
  let parentVersion: number | undefined;
  let previousParent: Marker | null = null;
  effect(() => {
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
  root: Node,
  parent: Lazy<Marker | null>,
  child: Marker,
  boundary?: ErrorBoundary,
): void {
  if (parent) {
    if (typeof parent === 'function') {
      watchLazyMarkerForMarker(root, parent, child, boundary);
    } else {
      watchNonLazyMarkerForMarker(root, parent, child);
    }
  } else {
    insert(root, child.node);
  }
  onCleanup(() => {
    if (!UNMOUNTING.getContext()) {
      remove(child.node);
    }
  });
}

function watchLazyMarkerForNodeWithLazySuspend(
  root: Node,
  parent: () => Marker | null,
  child: Node,
  suspended: () => boolean | undefined,
  boundary?: ErrorBoundary,
): void {
  let parentVersion: number | undefined;
  let previousParent: Marker | null = null;
  effect(() => {
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
  root: Node,
  parent: () => Marker | null,
  child: Node,
  suspended: Ref<boolean | undefined>,
  boundary?: ErrorBoundary,
): void {
  let parentVersion: number | undefined;
  let previousParent: Marker | null = null;
  effect(() => {
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
  root: Node,
  parent: () => Marker | null,
  child: Node,
  boundary?: ErrorBoundary,
): void {
  let parentVersion: number | undefined;
  let previousParent: Marker | null = null;
  effect(() => {
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
  root: Node,
  parent: Marker,
  child: Node,
  suspended: () => boolean | undefined,
  boundary?: ErrorBoundary,
): void {
  let parentVersion: number | undefined;
  effect(() => {
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
  root: Node,
  parent: Marker,
  child: Node,
  suspended: Ref<boolean | undefined>,
  boundary?: ErrorBoundary,
): void {
  let parentVersion: number | undefined;
  effect(() => {
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
  root: Node,
  parent: Marker,
  child: Node,
): void {
  let parentVersion: number | undefined;
  watch(
    parent.version,
    () => {
      const newVersion = parent.version.value;
      if (parentVersion !== newVersion) {
        parentVersion = newVersion;
        insert(root, child, parent.node);
      }
    },
    true,
  );
}

function watchNoMarkerForNodeWithRefSuspend(
  root: Node,
  child: Node,
  suspended: Ref<boolean | undefined>,
): void {
  watch(
    suspended,
    () => {
      if (suspended.value) {
        insert(root, child);
      }
    },
    true,
  );
}

export function watchMarkerForNode(
  root: Node,
  parent: Lazy<Marker | null>,
  child: Node,
  suspended: InternalShallowReactive<boolean | undefined> = false,
  boundary?: ErrorBoundary,
): void {
  if (parent) {
    if (typeof parent === 'function') {
      if (typeof suspended === 'function') {
        watchLazyMarkerForNodeWithLazySuspend(
          root,
          parent,
          child,
          suspended,
          boundary,
        );
      } else if (typeof suspended === 'object') {
        watchLazyMarkerForNodeWithRefSuspend(
          root,
          parent,
          child,
          suspended,
          boundary,
        );
      } else if (suspended) {
        // no-op
      } else {
        watchLazyMarkerForNode(
          root,
          parent,
          child,
          boundary,
        );
      }
    } else if (typeof suspended === 'function') {
      watchMarkerForNodeWithLazySuspend(
        root,
        parent,
        child,
        suspended,
        boundary,
      );
    } else if (typeof suspended === 'object') {
      watchMarkerForNodeWithRefSuspend(
        root,
        parent,
        child,
        suspended,
        boundary,
      );
    } else if (suspended) {
      // no-op
    } else {
      watchActualMarkerForMarker(
        root,
        parent,
        child,
      );
    }
  } else if (typeof suspended === 'object') {
    watchNoMarkerForNodeWithRefSuspend(
      root,
      child,
      suspended,
    );
  } else if (suspended) {
    // no-op
  } else {
    insert(root, child);
  }

  onCleanup(() => {
    if (!UNMOUNTING.getContext()) {
      remove(child);
    }
  });
}
