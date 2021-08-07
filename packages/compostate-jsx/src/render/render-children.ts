import { effect, onCleanup } from 'compostate';
import { VNode } from '../types';
import { createText, insert, remove } from '../dom';
import diff from './diff';

function hasReactiveChildren(children: VNode[]): boolean {
  for (let i = 0; i < children.length; i += 1) {
    const child = children[i];

    if (typeof child === 'object' && child && ('derive' in child || 'value' in child)) {
      return true;
    }
    if (Array.isArray(child)) {
      return hasReactiveChildren(child);
    }
  }
  return false;
}

function normalizeChildren(children: VNode[], base: Node[] = []): Node[] {
  for (let i = 0; i < children.length; i += 1) {
    const child = children[i];

    if (child == null || child === true || child === false) {
      // no-op
    } else if (child instanceof Node) {
      base.push(child);
    } else if (Array.isArray(child)) {
      normalizeChildren(child, base);
    } else if (typeof child === 'string' || typeof child === 'number') {
      base.push(createText(`${child}`));
    } else if ('derive' in child) {
      const item = child.derive();
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
          normal.forEach((child) => {
            insert(root, child, marker);
          });
        } else if (normal.length === 0) {
          normalPrev.forEach((child) => {
            remove(child);
          });
        } else {
          diff(root, normalPrev, normal, marker);
        }
      } else if (previous instanceof Node) {
        remove(previous);
        normal.forEach((child) => {
          insert(root, child, marker);
        });
      } else {
        normal.forEach((child) => {
          insert(root, child, marker);
        });
      }
    } else if (hasReactiveChildren(children)) {
      let previousChildren: Node[];
      const childMarker = createText('');
      insert(root, childMarker, marker);
      effect(() => {
        const newChildren = normalizeChildren(children);
        renderChildren(root, newChildren, previousChildren, childMarker, true);
        previousChildren = newChildren;
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
  } else if (typeof children === 'string' || typeof children === 'number') {
    const node = createText(`${children}`);
    insert(root, node, marker);
    onCleanup(() => {
      remove(node);
    });
  } else if (children == null || typeof children === 'boolean') {
    // skip
  } else if ('derive' in children) {
    let previousChildren: VNode;
    const childMarker = createText('');
    insert(root, childMarker, marker);
    effect(() => {
      const newChildren = children.derive();
      renderChildren(root, newChildren, previousChildren, childMarker);
      previousChildren = newChildren;
    });
    onCleanup(() => {
      remove(childMarker);
    });
  } else {
    let previousChildren: VNode;
    const childMarker = createText('');
    insert(root, childMarker, marker);
    effect(() => {
      const newChildren = children.value;
      renderChildren(root, newChildren, previousChildren, childMarker);
      previousChildren = newChildren;
    });
    onCleanup(() => {
      remove(childMarker);
    });
  }
}
