interface Work {
  tag: number;
  id: number;
  alive: boolean;
}
export interface PublisherWork extends Work {
  type: 'publisher';
  subscribers?: Set<SubscriberWork>
}

export interface SubscriberWork extends Work {
  type: 'subscriber';
  publishers?: Set<PublisherWork>;
}

export type LinkedWork = PublisherWork | SubscriberWork;

let RUNNER: (work: SubscriberWork) => void;

export function setRunner(work: (work: SubscriberWork) => void): void {
  RUNNER = work;
}

let STATE = 0;

export function createPublisherWork(tag: number): PublisherWork {
  return {
    type: 'publisher',
    tag,
    id: STATE++,
    alive: true,
  };
}

export function createSubscriberWork(tag: number): SubscriberWork {
  return {
    type: 'subscriber',
    tag,
    id: STATE++,
    alive: true,
  };
}

export function publisherLinkSubscriber(
  publisher: PublisherWork,
  subscriber: SubscriberWork,
): void {
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
  if (target.type === 'publisher') {
    const { subscribers } = target;
    if (subscribers?.size) {
      const copy = Array.from(subscribers);
      for (let i = 0, len = copy.length; i < len; i++) {
        flattenLinkedWork(copy[i], queue);
      }
    }
  } else {
    // Sets are internally ordered, so we can emulate
    // a simple queue where we move the node to the end
    // of the order
    // Currently this is the fastest and cheapest
    // non-linked list operation we can do
    queue.delete(target);
    queue.add(target);
  }
}

function evaluateLinkedWork(target: LinkedWork): void {
  if (target.type === 'publisher') {
    const { subscribers } = target;
    if (subscribers?.size) {
      const copy = Array.from(subscribers);
      for (let i = 0, len = copy.length; i < len; i++) {
        RUNNER(copy[i]);
      }
    }
  } else {
    RUNNER(target);
  }
}

export function runLinkedWork(target: LinkedWork, queue?: Set<LinkedWork>): void {
  if (target.alive) {
    if (queue) {
      flattenLinkedWork(target, queue);
    } else {
      evaluateLinkedWork(target);
    }
  }
}

export function unlinkLinkedWorkPublishers(target: SubscriberWork): void {
  const { publishers } = target;
  if (publishers) {
    const copy = Array.from(publishers);
    for (let i = 0, len = copy.length; i < len; i++) {
      copy[i].subscribers?.delete(target);
    }
    publishers.clear();
  }
}

export function destroyLinkedWork(target: LinkedWork): void {
  target.alive = false;
  if (target.type === 'subscriber') {
    unlinkLinkedWorkPublishers(target);
    target.publishers = undefined;
  } else {
    target.subscribers?.clear();
    target.subscribers = undefined;
  }
}
