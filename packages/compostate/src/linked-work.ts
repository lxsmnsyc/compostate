export interface LinkedWork {
  isSubscriber: boolean;
  tag: number;
  id: number;
  alive: boolean;
  links?: LinkedWork | Set<LinkedWork>;
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

function registerLink(
  left: LinkedWork,
  right: LinkedWork,
): void {
  if (!left.links) {
    left.links = right;
  } else {
    let currentLinks = left.links;
    if (!(currentLinks instanceof Set)) {
      currentLinks = new Set([currentLinks]);
      left.links = currentLinks;
    }
    currentLinks.add(right);
  }
}

export function publisherLinkSubscriber(
  publisher: LinkedWork,
  subscriber: LinkedWork,
): void {
  if (publisher.alive && subscriber.alive) {
    registerLink(publisher, subscriber);
    registerLink(subscriber, publisher);
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
  if (target.links) {
    if (target.links instanceof Set) {
      for (const item of target.links.keys()) {
        enqueueSubscriberWork(item, queue);
      }
    } else {
      enqueueSubscriberWork(target.links, queue);
    }
  }
}

export function evaluatePublisherWork(target: LinkedWork): void {
  if (target.links) {
    if (target.links instanceof Set) {
      for (const item of target.links.keys()) {
        RUNNER(item);
      }
    } else {
      RUNNER(target.links);
    }
  }
}

export function unlinkLinkedWorkPublishers(target: LinkedWork): void {
  if (target.links) {
    if (target.links instanceof Set) {
      for (const item of target.links.keys()) {
        if (item.links instanceof Set) {
          item.links.delete(target);
        } else {
          item.links = undefined;
        }
      }
      target.links.clear();
    }
    target.links = undefined;
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
