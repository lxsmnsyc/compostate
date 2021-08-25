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

function enqueueSubscriberWork(
  target: SubscriberWork,
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

function enqueuePublisherWork(
  target: PublisherWork,
  queue: Set<LinkedWork>,
): void {
  const { subscribers } = target;
  if (subscribers?.size) {
    for (const item of subscribers.keys()) {
      enqueueSubscriberWork(item, queue);
    }
  }
}

function evaluatePublisherWork(target: PublisherWork): void {
  const { subscribers } = target;
  if (subscribers?.size) {
    for (const item of subscribers.keys()) {
      RUNNER(item);
    }
  }
}

export function runLinkedWork(target: LinkedWork, queue?: Set<LinkedWork>): void {
  if (target.alive) {
    if (target.type === 'publisher') {
      if (queue) {
        enqueuePublisherWork(target, queue);
      } else {
        evaluatePublisherWork(target);
      }
    } else if (queue) {
      enqueueSubscriberWork(target, queue);
    } else {
      RUNNER(target);
    }
  }
}

export function unlinkLinkedWorkPublishers(target: SubscriberWork): void {
  const { publishers } = target;
  if (publishers) {
    for (const item of publishers.keys()) {
      item.subscribers?.delete(target);
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
