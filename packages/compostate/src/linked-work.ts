/* eslint-disable max-classes-per-file */
let STATE = 0;

export abstract class LinkedWork {
  tag: number;

  id: number;

  alive = true;

  links: Set<LinkedWork> | undefined = undefined;

  constructor(
    tag: number,
  ) {
    this.tag = tag;
    this.id = STATE++;
  }

  register(link: LinkedWork) {
    if (this.links) {
      this.links.add(link);
    } else {
      this.links = new Set([link]);
    }
  }

  abstract enqueue(queue: Set<LinkedWork>): void;

  abstract run(): void;

  call() {
    if (this.alive) {
      this.run();
    }
  }
}

export class Publisher extends LinkedWork {
  link(link: Subscriber): void {
    link.register(this);
    this.register(link);
  }

  enqueue(queue: Set<LinkedWork>) {
    if (this.links) {
      for (const item of this.links.keys()) {
        item.enqueue(queue);
      }
    }
  }

  run() {
    if (this.links) {
      for (const item of this.links.keys()) {
        item.call();
      }
    }
  }

  destroy() {
    this.alive = false;
  }
}

export abstract class Subscriber extends LinkedWork {
  enqueue(queue: Set<LinkedWork>) {
    // Sets are internally ordered, so we can emulate
    // a simple queue where we move the node to the end
    // of the order
    // Currently this is the fastest and cheapest
    // non-linked list operation we can do
    queue.delete(this);
    queue.add(this);
  }

  abstract run(): void;

  clear() {
    if (this.links) {
      for (const item of this.links.keys()) {
        if (item.links instanceof Set) {
          item.links.delete(this);
        } else {
          item.links = undefined;
        }
      }
      this.links.clear();
    }
  }

  destroy() {
    this.alive = false;
    this.clear();
  }
}
