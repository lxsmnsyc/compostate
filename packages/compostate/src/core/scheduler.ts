interface ScheduledCallback {
  callback: () => void;
  next: ScheduledCallback | undefined;
  prev: ScheduledCallback | undefined;
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

export function scheduleCallback(callback: () => void): () => void {
  const node = {
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

  return removeCallback.bind(node);
}

export function flushCallbacks(shouldYield: () => boolean): void {
  let current = head;

  while (current && !shouldYield()) {
    current.callback();
    current = current.next;
  }

  if (current) {
    head = current;
    current.prev = undefined;
  } else {
    head = undefined;
    tail = undefined;
  }
}
