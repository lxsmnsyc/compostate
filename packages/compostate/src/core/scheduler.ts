interface ScheduledCallback {
  callback: () => void;
  next: ScheduledCallback | undefined;
  prev: ScheduledCallback | undefined;
}

interface IdleDeadline {
  didTimeout: boolean;
  timeRemaining(): number;
}

let head: ScheduledCallback | undefined;
let tail: ScheduledCallback | undefined;

function removeCallback(this: ScheduledCallback): void {
  if (this.next) {
    this.next.prev = this.prev;
  }
  if (this.prev) {
    this.prev.next = this.next;
  }
  if (tail === this) {
    tail = this.prev;
  }
  if (head === this) {
    head = this.next;
  }
}

function neverYield(): boolean {
  return false;
}

/**
 * The idle queue is only drained when something drives it. `requestIdleCallback`
 * is used when the host provides it so that deferred work can be interrupted by
 * higher priority work, otherwise the whole queue is drained on the next macro
 * task.
 */
const HAS_REQUEST_IDLE_CALLBACK = typeof requestIdleCallback === 'function';

let flushScheduled = false;

function performFlush(deadline?: IdleDeadline): void {
  flushScheduled = false;
  flushCallbacks(
    deadline
      ? () => !deadline.didTimeout && deadline.timeRemaining() <= 0
      : neverYield,
  );
  if (head) {
    requestFlush();
  }
}

function requestFlush(): void {
  if (flushScheduled) {
    return;
  }
  flushScheduled = true;
  if (HAS_REQUEST_IDLE_CALLBACK) {
    requestIdleCallback(performFlush, { timeout: 100 });
  } else {
    setTimeout(performFlush, 0);
  }
}

export function scheduleCallback(callback: () => void): () => void {
  const node: ScheduledCallback = {
    callback,
    next: undefined,
    prev: tail,
  };

  if (tail) {
    tail.next = node;
  } else if (!head) {
    head = node;
  }
  tail = node;

  requestFlush();

  return removeCallback.bind(node);
}

export function flushCallbacks(shouldYield: () => boolean): void {
  while (head && !shouldYield()) {
    const current = head;
    // Dequeue before running so that a callback which throws is not retried on
    // the next flush.
    head = current.next;
    if (head) {
      head.prev = undefined;
    } else {
      tail = undefined;
    }
    current.next = undefined;
    current.prev = undefined;
    current.callback();
  }
}

/**
 * Drains every pending deferred computation synchronously. Useful for tests and
 * for server rendering, where there is no idle time to wait for.
 */
export function flushIdle(): void {
  while (head) {
    flushCallbacks(neverYield);
  }
}
