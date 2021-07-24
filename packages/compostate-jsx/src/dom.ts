import { ref, Ref } from 'compostate';
import {
  createLinkedList,
  createLinkedListNode,
  insertTail,
  LinkedListNode,
} from './linked-list';

interface Insert {
  type: 'insert';
  parent: Node;
  marker?: Node | null;
}

interface Remove {
  type: 'remove';
  parent?: undefined;
  marker?: undefined;
}

type Operation = Insert | Remove;

interface CommitAction {
  target: Node;
  operation: Operation;
}

let schedule: boolean;
const commits = createLinkedList<CommitAction>();
const currentCommit = new Map<Node, LinkedListNode<CommitAction>>();

function commit(node: Node, op: Operation): void {
  if (!schedule) {
    Promise.resolve().then(() => {
      let call = commits.head;

      while (call) {
        const { target, operation } = call.value;
        switch (operation.type) {
          case 'insert':
            if (operation.parent !== target.parentNode) {
              operation.parent.insertBefore(target, operation.marker ?? null);
            }
            break;
          case 'remove':
            target.parentNode?.removeChild(target);
            break;
          default:
            break;
        }
        call = call.next;
      }
      commits.head = undefined;
      commits.tail = undefined;
      currentCommit.clear();
      schedule = false;
    }, () => {
      // no-op;
    });

    schedule = true;
  }

  const currentOperation = currentCommit.get(node);

  if (currentOperation) {
    currentOperation.value.operation.type = op.type;
    currentOperation.value.operation.parent = op.parent;
    currentOperation.value.operation.marker = op.marker;
    insertTail(commits, currentOperation);
  } else {
    const newOperation: LinkedListNode<CommitAction> = createLinkedListNode({
      target: node,
      operation: op,
    });
    currentCommit.set(node, newOperation);
    insertTail(commits, newOperation);
  }
}

/* eslint-disable no-param-reassign */
export function insert(
  parent: Node,
  child: Node,
  marker: Node | null = null,
): void {
  commit(child, {
    type: 'insert',
    parent,
    marker,
  });
}

export function remove(
  node: Node,
): void {
  commit(node, {
    type: 'remove',
  });
}

export function createText(value: string): Node {
  return document.createTextNode(value);
}

export interface Marker {
  id: number;
  version: Ref<number>;
  node: Node;
}

let id = 0;

const USE_COMMENT = false;

export function createMarker(): Marker {
  const newID = id;
  id += 1;
  return {
    id: newID,
    version: ref(0),
    node: USE_COMMENT ? document.createComment(`${newID}`) : createText(''),
  };
}

function setAttributeSafe(el: Element, attribute: string, value: string | null): void {
  if (value == null) {
    el.removeAttribute(attribute);
  } else if (value !== el.getAttribute(value)) {
    el.setAttribute(attribute, value);
  }
}

export function setAttribute(el: Element, attribute: string, value: string | null): void {
  const prototype = Object.getPrototypeOf(el);
  const descriptor = Object.getOwnPropertyDescriptor(prototype, attribute);

  if (attribute === 'className') {
    setAttributeSafe(el, 'class', value);
  } else if (attribute === 'textContent') {
    el.textContent = value;
  } else if (attribute === 'innerHTML') {
    el.innerHTML = value ?? '';
  } else if (descriptor && descriptor.set) {
    (el as Record<string, any>)[attribute] = value;
  } else {
    setAttributeSafe(el, attribute, value);
  }
}

export function registerEvent<E extends Element>(
  el: E,
  name: string,
  handler: <Ev extends Event>(ev: Ev) => void,
): () => void {
  // Extract event name
  const event = name.substring(2).toLowerCase();
  // Check if event name ends with 'capture'
  const capture = event.endsWith('capture');
  // Capture actual DOM event
  const actualEvent = event.substring(
    0,
    event.length - (capture ? 7 : 0),
  );

  // Register
  el.addEventListener(actualEvent, handler, {
    capture,
  });

  // Unregister
  return () => {
    el.removeEventListener(actualEvent, handler, {
      capture,
    });
  };
}
