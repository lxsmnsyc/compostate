import {
  LinkedList,
  LinkedListNode,
  createLinkedList,
  createLinkedListNode,
  insertTail,
  removeNode,
  cloneList,
} from './linked-list';

let ID = 0;

function getID() {
  const id = ID;
  ID += 1;
  return id;
}

export interface LinkedWork {
  (): void;
  id: number;
  alive: boolean;
  dependents?: LinkedList<LinkedWork>;
  dependentsPosition?: Record<string, LinkedListNode<LinkedWork> | undefined>;
  dependencies?: LinkedList<LinkedWork>;
  dependenciesPosition?: Record<string, LinkedListNode<LinkedWork> | undefined>;
}

export function createLinkedWork(work?: () => void): LinkedWork {
  return Object.assign(work ?? (() => { /* no-op */ }), {
    id: getID(),
    alive: true,
  });
}

export function addLinkedWorkDependent(target: LinkedWork, dependent: LinkedWork): void {
  if (target.alive) {
    if (!target.dependents || !target.dependentsPosition) {
      target.dependents = createLinkedList();
      target.dependentsPosition = {};
    }
    if (!target.dependentsPosition[dependent.id]) {
      const node = createLinkedListNode(dependent);
      target.dependentsPosition[dependent.id] = node;
      insertTail(target.dependents, node);
    }
  }
}

export function removeLinkedWorkDependent(target: LinkedWork, dependent: LinkedWork): void {
  if (!target.dependents || !target.dependentsPosition) {
    return;
  }
  const node = target.dependentsPosition[dependent.id];
  if (node) {
    removeNode(target.dependents, node);
    target.dependentsPosition[dependent.id] = undefined;
  }
}

export function addLinkedWorkDependency(target: LinkedWork, dependency: LinkedWork): void {
  if (target.alive) {
    if (!target.dependencies || !target.dependenciesPosition) {
      target.dependencies = createLinkedList();
      target.dependenciesPosition = {};
    }
    if (!target.dependenciesPosition[dependency.id]) {
      const node = createLinkedListNode(dependency);
      target.dependenciesPosition[dependency.id] = node;
      insertTail(target.dependencies, node);
    }
  }
}

export function removeLinkedWorkDependency(target: LinkedWork, dependency: LinkedWork): void {
  if (!target.dependencies || !target.dependenciesPosition) {
    return;
  }
  const node = target.dependenciesPosition[dependency.id];
  if (node) {
    removeNode(target.dependencies, node);
    target.dependenciesPosition[dependency.id] = undefined;
  }
}

function flattenLinkedWork(target: LinkedWork, queue: Set<LinkedWork>): void {
  if (target.alive) {
    queue.delete(target);
    queue.add(target);
    let node = target.dependents?.head;
    while (node) {
      flattenLinkedWork(node.value, queue);
      node = node.next;
    }
  }
}

export function runLinkedWork(target: LinkedWork, queue?: Set<LinkedWork>): void {
  if (queue) {
    flattenLinkedWork(target, queue);
  } else if (target.alive) {
    target();

    if (target.dependents) {
      const list = cloneList(target.dependents);
      let node = list.head;
      while (node) {
        runLinkedWork(node.value);
        node = node.next;
      }
    }
  }
}

export function unlinkLinkedWorkDependencies(target: LinkedWork): void {
  if (target.dependencies) {
    const list = cloneList(target.dependencies);
    let node = list.head;
    while (node) {
      removeLinkedWorkDependent(node.value, target);
      node = node.next;
    }
  }
}

export function destroyLinkedWork(target: LinkedWork): void {
  target.alive = false;
  unlinkLinkedWorkDependencies(target);
  delete target.dependencies;
  delete target.dependents;
  delete target.dependenciesPosition;
  delete target.dependentsPosition;
}
