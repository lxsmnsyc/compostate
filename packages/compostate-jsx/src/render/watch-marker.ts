/* eslint-disable no-param-reassign */
import {
  onCleanup,
  effect,
  untrack,
  Ref,
} from 'compostate';
import Context from '../context';
import { Marker, insert, remove, append } from '../dom';
import { InternalShallowReactive, Lazy } from './types';

export const UNMOUNTING = new Context<boolean | undefined>();

function watchNonLazyMarkerForMarker(
  root: HTMLElement,
  parent: Marker,
  child: Marker,
): void {
  let initialCall = true;
  let parentVersion: number | undefined;
  effect(() => {
    const newVersion = parent.version.value;
    if (parentVersion !== newVersion) {
      parentVersion = newVersion;
      insert(root, child.node, parent.node);
      if (!initialCall) {
        child.version.value = untrack(() => child.version.value) + 1;
      }
    }
    initialCall = false;
  });
}

function watchLazyMarkerForMarker(
  root: HTMLElement,
  parent: () => Marker | null,
  child: Marker,
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
  });
}

export function watchMarkerForMarker(
  root: HTMLElement,
  parent: Lazy<Marker | null>,
  child: Marker,
): void {
  if (parent) {
    if (typeof parent === 'function') {
      watchLazyMarkerForMarker(root, parent, child);
    } else {
      watchNonLazyMarkerForMarker(root, parent, child);
    }
  } else {
    append(root, child.node);
  }
  onCleanup(() => {
    if (!UNMOUNTING.getContext()) {
      remove(child.node);
    }
  });
}

function watchLazyMarkerForNodeWithLazySuspend(
  root: HTMLElement,
  parent: () => Marker | null,
  child: Node,
  suspended: () => boolean | undefined,
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
    if (!suspended()) {
      if (actualParent) {
        const newVersion = actualParent.version.value;
        // Check if the parent marker has changed position
        if (parentVersion !== newVersion) {
          parentVersion = newVersion;
          insert(root, child, actualParent.node);
        }
      } else {
        // No parent, just append child
        append(root, child);
      }
    } else {
      remove(child);
    }
  });
}

function watchLazyMarkerForNodeWithRefSuspend(
  root: HTMLElement,
  parent: () => Marker | null,
  child: Node,
  suspended: Ref<boolean | undefined>,
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
    if (!suspended.value) {
      if (actualParent) {
        const newVersion = actualParent.version.value;
        // Check if the parent marker has changed position
        if (parentVersion !== newVersion) {
          parentVersion = newVersion;
          insert(root, child, actualParent.node);
        }
      } else {
        // No parent, just append child
        append(root, child);
      }
    } else {
      remove(child);
    }
  });
}

function watchLazyMarkerForNode(
  root: HTMLElement,
  parent: () => Marker | null,
  child: Node,
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
      append(root, child);
    }
  });
}

function watchMarkerForNodeWithLazySuspend(
  root: HTMLElement,
  parent: Marker,
  child: Node,
  suspended: () => boolean | undefined,
): void {
  let parentVersion: number | undefined;
  effect(() => {
    const newVersion = parent.version.value;
    if (suspended()) {
      remove(child);
    } else if (parentVersion !== newVersion) {
      parentVersion = newVersion;
      insert(root, child, parent.node);
    }
  });
}

function watchMarkerForNodeWithRefSuspend(
  root: HTMLElement,
  parent: Marker,
  child: Node,
  suspended: Ref<boolean | undefined>,
): void {
  let parentVersion: number | undefined;
  effect(() => {
    const newVersion = parent.version.value;
    if (suspended.value) {
      remove(child);
    } else if (parentVersion !== newVersion) {
      parentVersion = newVersion;
      insert(root, child, parent.node);
    }
  });
}

function watchActualMarkerForMarker(
  root: HTMLElement,
  parent: Marker,
  child: Node,
): void {
  let parentVersion: number | undefined;
  effect(() => {
    const newVersion = parent.version.value;
    if (parentVersion !== newVersion) {
      parentVersion = newVersion;
      insert(root, child, parent.node);
    }
  });
}

function watchNoMarkerForNodeWithRefSuspend(
  root: HTMLElement,
  child: Node,
  suspended: Ref<boolean | undefined>,
): void {
  effect(() => {
    if (suspended.value) {
      remove(child);
    } else {
      append(root, child);
    }
  });
}

export function watchMarkerForNode(
  root: HTMLElement,
  parent: Lazy<Marker | null>,
  child: Node,
  suspended: InternalShallowReactive<boolean | undefined> = false,
): void {
  if (parent) {
    if (typeof parent === 'function') {
      if (typeof suspended === 'function') {
        watchLazyMarkerForNodeWithLazySuspend(
          root,
          parent,
          child,
          suspended,
        );
      } else if (typeof suspended === 'object') {
        watchLazyMarkerForNodeWithRefSuspend(
          root,
          parent,
          child,
          suspended,
        );
      } else if (suspended) {
        // no-op
      } else {
        watchLazyMarkerForNode(
          root,
          parent,
          child,
        );
      }
    } else if (typeof suspended === 'function') {
      watchMarkerForNodeWithLazySuspend(
        root,
        parent,
        child,
        suspended,
      );
    } else if (typeof suspended === 'object') {
      watchMarkerForNodeWithRefSuspend(
        root,
        parent,
        child,
        suspended,
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
    append(root, child);
  }

  onCleanup(() => {
    if (!UNMOUNTING.getContext()) {
      remove(child);
    }
  });
}
