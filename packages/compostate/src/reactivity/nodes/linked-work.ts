import Context from '../../context';
import {
  createLinkedList,
  createLinkedListNode,
  insertTail,
  LinkedList,
  LinkedListNode,
  removeNode,
} from '../../linked-list';

export const TRACKING = new Context<LinkedWork | undefined>();
export const BATCH_UPDATES = new Context<Set<LinkedWork> | undefined>();

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

  private dependentsPosition?: Record<string, LinkedListNode<LinkedWork>>;

  addDependent(dependent: LinkedWork): void {
    if (this.alive) {
      if (!this.dependents || !this.dependentsPosition) {
        this.dependents = createLinkedList();
        this.dependentsPosition = {};
      }
      if (!(dependent.id in this.dependentsPosition)) {
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
    if (dependent.id in this.dependentsPosition) {
      removeNode(this.dependents, this.dependentsPosition[dependent.id]);
    }
  }

  private dependencies?: LinkedList<LinkedWork>;

  private dependenciesPosition?: Record<string, LinkedListNode<LinkedWork>>;

  addDependency(dependency: LinkedWork): void {
    if (this.alive) {
      if (!this.dependencies || !this.dependenciesPosition) {
        this.dependencies = createLinkedList();
        this.dependenciesPosition = {};
      }
      if (!(dependency.id in this.dependenciesPosition)) {
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
    if (dependency.id in this.dependenciesPosition) {
      removeNode(this.dependencies, this.dependenciesPosition[dependency.id]);
    }
  }

  run(): void {
    if (this.alive) {
      this.work?.();

      let node = this.dependents?.head;
      while (node) {
        node.value.run();
        node = node.next;
      }
    }
  }

  unlinkDependencies(): void {
    let node = this.dependencies?.head;
    while (node) {
      node.value.removeDependent(this);
      node = node.next;
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
