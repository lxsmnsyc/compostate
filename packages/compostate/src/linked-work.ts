export interface LinkedWork {
  tag: number;
  id: number;
  alive: boolean;
  publishers?: Set<LinkedWork>;
  subscribers?: Set<LinkedWork>
}

let RUNNER: (work: LinkedWork) => void;

export function setRunner(work: (work: LinkedWork) => void): void {
  RUNNER = work;
}

let STATE = 0;

export function createLinkedWork(tag: number): LinkedWork {
  return {
    tag,
    id: STATE++,
    alive: true,
  };
}

export function linkLinkedWork(publisher: LinkedWork, subscriber: LinkedWork): void {
  if (publisher.alive && subscriber.alive) {
    if (!publisher.subscribers) {
      publisher.subscribers = new Set();
    }
    publisher.subscribers.add(subscriber);
    if (!subscriber.publishers) {
      subscriber.publishers = new Set();
    }
    subscriber.publishers.add(publisher);
  }
}

function flattenLinkedWork(target: LinkedWork, queue: Set<LinkedWork>): void {
  if (target.alive) {
    queue.delete(target);
    queue.add(target);
    const { subscribers } = target;
    if (subscribers?.size) {
      const copy = new Set(subscribers);
      for (const subscriber of copy) {
        flattenLinkedWork(subscriber, queue);
      }
    }
  }
}

export function runLinkedWorkAlone(target: LinkedWork): void {
  if (target.alive) {
    RUNNER(target);
  }
}

function evaluateLinkedWork(target: LinkedWork): void {
  if (target.alive) {
    RUNNER(target);
    const { subscribers } = target;
    if (subscribers?.size) {
      const copy = new Set(subscribers);
      for (const subscriber of copy) {
        evaluateLinkedWork(subscriber);
      }
    }
  }
}

export function runLinkedWork(target: LinkedWork, queue?: Set<LinkedWork>): void {
  if (queue) {
    flattenLinkedWork(target, queue);
  } else {
    evaluateLinkedWork(target);
  }
}

export function unlinkLinkedWorkPublishers(target: LinkedWork): void {
  const { publishers } = target;
  if (publishers) {
    const copy = new Set(publishers);
    for (const publisher of copy) {
      publisher.subscribers?.delete(target);
    }
    publishers.clear();
  }
}

export function destroyLinkedWork(target: LinkedWork): void {
  target.alive = false;
  unlinkLinkedWorkPublishers(target);
  target.subscribers?.clear();
  target.subscribers = undefined;
  target.publishers = undefined;
}
