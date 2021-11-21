export interface LinkedWork {
  isSubscriber: boolean;
  tag: number;
  id: number;
  alive: boolean;
  links?: Set<LinkedWork>;
}

let RUNNER: (work: LinkedWork) => void;

export function setRunner(work: (work: LinkedWork) => void): void {
  RUNNER = work;
}

let STATE = 0;

export function createLinkedWork(
  isSubscriber: boolean,
  tag: number,
): LinkedWork {
  return {
    isSubscriber,
    tag,
    id: STATE++,
    alive: true,
  };
}

export function publisherLinkSubscriber(
  publisher: LinkedWork,
  subscriber: LinkedWork,
): void {
  if (publisher.alive && subscriber.alive) {
    if (!publisher.links) {
      publisher.links = new Set();
    }
    publisher.links.add(subscriber);
    if (!subscriber.links) {
      subscriber.links = new Set();
    }
    subscriber.links.add(publisher);
  }
}

export function enqueueSubscriberWork(
  target: LinkedWork,
  queue: Set<LinkedWork>,
): void {
  // Sets are internally ordered, so we can emulate
  // a simple queue where we move the node to the end
  // of the order
  // Currently this is the fastest and cheapest
  // non-linked list operation we can do
  queue.delete(target);
  queue.add(target);
}

export function evaluateSubscriberWork(
  target: LinkedWork,
): void {
  RUNNER(target);
}

export function enqueuePublisherWork(
  target: LinkedWork,
  queue: Set<LinkedWork>,
): void {
  if (target.links?.size) {
    for (const item of target.links.keys()) {
      enqueueSubscriberWork(item, queue);
    }
  }
}

export function evaluatePublisherWork(target: LinkedWork): void {
  if (target.links?.size) {
    for (const item of target.links.keys()) {
      RUNNER(item);
    }
  }
}

export function unlinkLinkedWorkPublishers(target: LinkedWork): void {
  if (target.links) {
    for (const item of target.links.keys()) {
      item.links?.delete(target);
    }
    target.links.clear();
  }
}

export function destroyLinkedWork(target: LinkedWork): void {
  if (target.alive) {
    target.alive = false;
    if (target.isSubscriber) {
      unlinkLinkedWorkPublishers(target);
    }
    target.links = undefined;
  }
}
