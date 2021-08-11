export const TAG = 0;
export const ID = 1;
export const ALIVE = 2;
export const SUBSCRIBERS = 3;
export const PUBLISHERS = 4;
export const PENDING = 5;

export type LinkedWork = [
  string,
  number,
  boolean,
  LinkedWork[] | undefined,
  LinkedWork[] | undefined,
  boolean,
];

const RUNNER: Record<string, (work: LinkedWork) => void> = {};

export function setRunner(tag: string, work: (work: LinkedWork) => void): void {
  RUNNER[tag] = work;
}

let STATE = 0;

export function createLinkedWork(tag: string): LinkedWork {
  return [
    tag,
    STATE++,
    true,
    undefined,
    undefined,
    false,
  ];
}

export function linkLinkedWork(publisher: LinkedWork, subscriber: LinkedWork): void {
  if (publisher[ALIVE] && subscriber[ALIVE]) {
    if (!publisher[SUBSCRIBERS]) {
      publisher[SUBSCRIBERS] = [];
    }
    publisher[SUBSCRIBERS]!.push(subscriber);
    if (!subscriber[PUBLISHERS]) {
      subscriber[PUBLISHERS] = [];
    }
    subscriber[PUBLISHERS]!.push(publisher);
  }
}

function flattenLinkedWork(target: LinkedWork, queue: LinkedWork[]): void {
  if (target[ALIVE] && !target[PENDING]) {
    target[PENDING] = true;
    queue.push(target);
    const subscribers = target[SUBSCRIBERS];
    if (subscribers) {
      for (let i = 0, len = subscribers.length; i < len; i++) {
        flattenLinkedWork(subscribers[i], queue);
      }
    }
  }
}

export function runLinkedWorkAlone(target: LinkedWork): void {
  if (target[ALIVE]) {
    target[PENDING] = false;
    RUNNER[target[TAG]](target);
  }
}

function evaluateLinkedWork(target: LinkedWork): void {
  if (target[ALIVE]) {
    target[PENDING] = false;
    RUNNER[target[TAG]](target);
    const subscribers = target[SUBSCRIBERS];
    if (subscribers) {
      for (let i = 0, len = subscribers.length; i < len; i++) {
        evaluateLinkedWork(subscribers[i]);
      }
    }
  }
}

export function runLinkedWork(target: LinkedWork, queue?: LinkedWork[]): void {
  if (queue) {
    flattenLinkedWork(target, queue);
  } else {
    evaluateLinkedWork(target);
  }
}

export function unlinkLinkedWorkPublishers(target: LinkedWork): void {
  const publishers = target[PUBLISHERS];
  if (publishers) {
    for (let i = 0, len = publishers.length; i < len; i++) {
      const subscribers = publishers[i][SUBSCRIBERS];
      if (subscribers) {
        for (let j = 0, slen = subscribers?.length; j < slen; j++) {
          if (subscribers[i] === target) {
            subscribers[i] = subscribers.pop()!;
            break;
          }
        }
      }
    }
    target[PUBLISHERS] = [];
  }
}

export function destroyLinkedWork(target: LinkedWork): void {
  target[ALIVE] = false;
  unlinkLinkedWorkPublishers(target);
}
