/* eslint-disable no-param-reassign */
export interface LinkedListNode<T> {
  next?: LinkedListNode<T>;
  prev?: LinkedListNode<T>;
  value: T;
}

export interface LinkedList<T> {
  head?: LinkedListNode<T>;
  tail?: LinkedListNode<T>;
}

export function createLinkedListNode<T>(value: T): LinkedListNode<T> {
  return {
    value,
  };
}

export function createLinkedList<T>(): LinkedList<T> {
  return {};
}

export function insertAfter<T>(
  list: LinkedList<T>,
  newNode: LinkedListNode<T>,
  refNode: LinkedListNode<T>,
): void {
  newNode.prev = refNode;
  if (!refNode.next) {
    list.tail = newNode;
    newNode.next = undefined;
  } else {
    newNode.next = refNode.next;
    refNode.next.prev = newNode;
  }
  refNode.next = newNode;
}

export function insertBefore<T>(
  list: LinkedList<T>,
  newNode: LinkedListNode<T>,
  refNode: LinkedListNode<T>,
): void {
  newNode.next = refNode;
  if (!refNode.prev) {
    list.head = newNode;
    newNode.prev = undefined;
  } else {
    newNode.prev = refNode.prev;
    refNode.prev.next = newNode;
  }
  refNode.prev = newNode;
}

export function insertHead<T>(
  list: LinkedList<T>,
  newNode: LinkedListNode<T>,
): void {
  if (list.head == null) {
    list.head = newNode;
    list.tail = newNode;
    newNode.next = undefined;
    newNode.prev = undefined;
  } else {
    insertBefore(list, newNode, list.head);
  }
}

export function insertTail<T>(
  list: LinkedList<T>,
  newNode: LinkedListNode<T>,
): void {
  if (list.tail == null) {
    list.head = newNode;
    list.tail = newNode;
    newNode.next = undefined;
    newNode.prev = undefined;
  } else {
    insertAfter(list, newNode, list.tail);
  }
}

export function removeNode<T>(
  list: LinkedList<T>,
  node: LinkedListNode<T>,
): void {
  if (node.prev == null) {
    list.head = node.next;
  } else {
    node.prev.next = node.next;
  }
  if (node.next == null) {
    list.tail = node.prev;
  } else {
    node.next.prev = node.prev;
  }
}

export function cloneList<T>(
  list: LinkedList<T>,
): LinkedList<T> {
  const newList = createLinkedList<T>();

  let node = list.head;

  while (node) {
    insertTail(newList, createLinkedListNode(node.value));
    node = node.next;
  }

  return newList;
}
