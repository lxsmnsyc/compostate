import { computation, isReactive, onCleanup } from 'compostate';
import { VNode } from '../types';
import {
  createFragment,
  createMarker,
  createText,
  insert,
  remove,
} from '../dom';
import diff from './diff';
import { evalDerived, isDerived } from '../reactivity';

function hasReactiveChildren(children: VNode[]): boolean {
  for (let i = 0, len = children.length, child: VNode; i < len; i++) {
    child = children[i];

    if (Array.isArray(child)) {
      return hasReactiveChildren(child);
    }
    if (child && typeof child === 'object' && (isDerived(child) || isReactive(child))) {
      return true;
    }
  }
  return false;
}

function normalizeChildren(children: VNode[], base: Node[] = []): Node[] {
  for (let i = 0, len = children.length, child: VNode; i < len; i++) {
    child = children[i];

    if (child == null || child === true || child === false) {
      // no-op
    } else if (child instanceof Node) {
      base.push(child);
    } else if (Array.isArray(child)) {
      normalizeChildren(child, base);
    } else if (typeof child === 'string' || typeof child === 'number') {
      base.push(createText(`${child}`));
    } else if (isDerived(child)) {
      const item = evalDerived(child);
      normalizeChildren(
        Array.isArray(item) ? item : [item],
        base,
      );
    } else {
      const item = child.value;
      normalizeChildren(
        Array.isArray(item) ? item : [item],
        base,
      );
    }
  }
  return base;
}

export default function renderChildren(
  root: Node,
  children: VNode,
  previous: VNode,
  marker: Node | null,
  normalized = false,
): void {
  if (Array.isArray(children)) {
    // Scan for reactive child
    if (normalized) {
      const normal = children as Node[];
      const normalPrev = previous as Node[];
      if (Array.isArray(previous)) {
        if (previous.length === 0) {
          // insert shortcut
          const fragment = createFragment();
          for (let i = 0, len = normal.length; i < len; i++) {
            insert(fragment, normal[i]);
          }
          insert(root, fragment, marker);
        } else if (normal.length === 0) {
          for (let i = 0, len = normalPrev.length; i < len; i++) {
            remove(normalPrev[i]);
          }
        } else {
          diff(root, normalPrev, normal, marker);
        }
      } else if (previous instanceof Node) {
        remove(previous);
        const fragment = createFragment();
        for (let i = 0, len = normal.length; i < len; i++) {
          insert(fragment, normal[i]);
        }
        insert(root, fragment, marker);
      } else {
        const fragment = createFragment();
        for (let i = 0, len = normal.length; i < len; i++) {
          insert(fragment, normal[i]);
        }
        insert(root, fragment, marker);
      }
    } else if (hasReactiveChildren(children)) {
      const childMarker = createMarker();
      insert(root, childMarker, marker);
      computation((prev) => {
        const next = normalizeChildren(children);
        renderChildren(root, next, prev, childMarker, true);
        return next;
      });
      onCleanup(() => {
        remove(childMarker);
      });
    } else {
      renderChildren(
        root,
        normalizeChildren(children),
        null,
        marker,
        true,
      );
    }
  } else if (children instanceof Node) {
    insert(root, children, marker);
    onCleanup(() => {
      remove(children);
    });
  } else if (typeof children === 'string' || typeof children === 'number') {
    const node = createText(`${children}`);
    insert(root, node, marker);
    onCleanup(() => {
      remove(node);
    });
  } else if (children == null || children === true || children === false) {
    // skip
  } else if (isDerived(children)) {
    const childMarker = createMarker();
    insert(root, childMarker, marker);
    computation((prev) => {
      const next = evalDerived(children);
      renderChildren(root, next, prev, childMarker);
      return next;
    });
    onCleanup(() => {
      remove(childMarker);
    });
  } else {
    const childMarker = createMarker();
    insert(root, childMarker, marker);
    computation((prev) => {
      const next = children.value;
      renderChildren(root, next, prev, childMarker);
      return next;
    });
    onCleanup(() => {
      remove(childMarker);
    });
  }
}
