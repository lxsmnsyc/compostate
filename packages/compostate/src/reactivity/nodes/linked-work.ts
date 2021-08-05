import {
  cloneList,
  createLinkedList,
  createLinkedListNode,
  insertTail,
  LinkedList,
  LinkedListNode,
  removeNode,
} from '../../linked-list';

export let TRACKING: LinkedWork | undefined;
export let BATCH_UPDATES: Set<LinkedWork> | undefined;

export function setTracking(instance: LinkedWork | undefined): void {
  TRACKING = instance;
}

export function setBatchUpdates(instance: Set<LinkedWork> | undefined): void {
  BATCH_UPDATES = instance;
}

let ID = 0;

function getID() {
  const id = ID;
  ID += 1;
  return id;
}

export default class LinkedWork {
  private id = getID();

  private work?: () => void;

  private alive = true;

  constructor(work?: () => void) {
    this.work = work;
  }

  private dependents?: LinkedList<LinkedWork>;

  private dependentsPosition?: Record<string, LinkedListNode<LinkedWork> | undefined>;

  addDependent(dependent: LinkedWork): void {
    if (this.alive) {
      if (!this.dependents || !this.dependentsPosition) {
        this.dependents = createLinkedList();
        this.dependentsPosition = {};
      }
      if (!this.dependentsPosition[dependent.id]) {
        const node = createLinkedListNode(dependent);
        this.dependentsPosition[dependent.id] = node;
        insertTail(this.dependents, node);
      }
    }
  }

  removeDependent(dependent: LinkedWork): void {
    if (!this.dependents || !this.dependentsPosition) {
      return;
    }
    const node = this.dependentsPosition[dependent.id];
    if (node) {
      removeNode(this.dependents, node);
      this.dependentsPosition[dependent.id] = undefined;
    }
  }

  private dependencies?: LinkedList<LinkedWork>;

  private dependenciesPosition?: Record<string, LinkedListNode<LinkedWork> | undefined>;

  addDependency(dependency: LinkedWork): void {
    if (this.alive) {
      if (!this.dependencies || !this.dependenciesPosition) {
        this.dependencies = createLinkedList();
        this.dependenciesPosition = {};
      }
      if (!this.dependenciesPosition[dependency.id]) {
        const node = createLinkedListNode(dependency);
        this.dependenciesPosition[dependency.id] = node;
        insertTail(this.dependencies, node);
      }
    }
  }

  removeDependency(dependency: LinkedWork): void {
    if (!this.dependencies || !this.dependenciesPosition) {
      return;
    }
    const node = this.dependenciesPosition[dependency.id];
    if (node) {
      removeNode(this.dependencies, node);
      this.dependenciesPosition[dependency.id] = undefined;
    }
  }

  run(): void {
    if (this.alive) {
      this.work?.();

      if (this.dependents) {
        const list = cloneList(this.dependents);
        let node = list.head;
        while (node) {
          node.value.run();
          node = node.next;
        }
      }
    }
  }

  unlinkDependencies(): void {
    if (this.dependencies) {
      const list = cloneList(this.dependencies);
      let node = list.head;
      while (node) {
        node.value.removeDependent(this);
        node = node.next;
      }
    }
  }

  destroy(): void {
    this.alive = false;
    delete this.dependencies;
    delete this.dependents;
    delete this.dependenciesPosition;
    delete this.dependentsPosition;
  }
}
