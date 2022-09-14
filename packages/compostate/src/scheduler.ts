// From: https://github.com/solidjs/solid/blob/main/packages/solid/src/reactive/scheduler.ts

// Basic port modification of Reacts Scheduler: https://github.com/facebook/react/tree/master/packages/scheduler
export interface Task {
  id: number;
  fn: ((didTimeout: boolean) => void) | null;
  startTime: number;
  expirationTime: number;
}

// experimental new feature proposal stuff
type NavigatorScheduling = Navigator & {
  scheduling: { isInputPending?: () => boolean };
};

let taskIdCounter = 1;
let isCallbackScheduled = false;
let isPerformingWork = false;
const taskQueue: Task[] = [];
let currentTask: Task | null = null;
let shouldYieldToHost: (() => boolean) | null = null;
const yieldInterval = 5;
let deadline = 0;
const maxYieldInterval = 300;
let scheduleCallback: (() => void) | null = null;
let scheduledCallback: ((hasTimeRemaining: boolean, initialTime: number) => boolean) | null = null;

const maxSigned31BitInt = 1073741823;
/* istanbul ignore next */
function setupScheduler() {
  const channel = new MessageChannel();
  const port = channel.port2;
  scheduleCallback = () => port.postMessage(null);
  channel.port1.onmessage = () => {
    if (scheduledCallback !== null) {
      const currentTime = performance.now();
      deadline = currentTime + yieldInterval;
      const hasTimeRemaining = true;
      try {
        const hasMoreWork = scheduledCallback(hasTimeRemaining, currentTime);
        if (!hasMoreWork) {
          scheduledCallback = null;
        } else port.postMessage(null);
      } catch (error) {
        // If a scheduler task throws, exit the current browser task so the
        // error can be observed.
        port.postMessage(null);
        throw error;
      }
    }
  };

  if (
    typeof navigator !== 'undefined'
    && (navigator as NavigatorScheduling).scheduling
    && (navigator as NavigatorScheduling).scheduling.isInputPending
  ) {
    const { scheduling } = navigator as NavigatorScheduling;
    shouldYieldToHost = () => {
      const currentTime = performance.now();
      if (currentTime >= deadline) {
        // There's no time left. We may want to yield control of the main
        // thread, so the browser can perform high priority tasks. The main ones
        // are painting and user input. If there's a pending paint or a pending
        // input, then we should yield. But if there's neither, then we can
        // yield less often while remaining responsive. We'll eventually yield
        // regardless, since there could be a pending paint that wasn't
        // accompanied by a call to `requestPaint`, or other main thread tasks
        // like network events.
        if (scheduling.isInputPending!()) {
          return true;
        }
        // There's no pending input. Only yield if we've reached the max
        // yield interval.
        return currentTime >= maxYieldInterval;
      }
      // There's still time left in the frame.
      return false;
    };
  } else {
    // `isInputPending` is not available. Since we have no way of knowing if
    // there's pending input, always yield at the end of the frame.
    shouldYieldToHost = () => performance.now() >= deadline;
  }
}

function enqueue(queue: Task[], task: Task) {
  function findIndex() {
    let m = 0;
    let n = queue.length - 1;

    while (m <= n) {
      const k = (n + m) >> 1;
      const cmp = task.expirationTime - queue[k].expirationTime;
      if (cmp > 0) m = k + 1;
      else if (cmp < 0) n = k - 1;
      else return k;
    }
    return m;
  }
  queue.splice(findIndex(), 0, task);
}

function workLoop(hasTimeRemaining: boolean, initialTime: number) {
  let currentTime = initialTime;
  currentTask = taskQueue[0] || null;
  while (currentTask !== null) {
    if (currentTask.expirationTime > currentTime && (!hasTimeRemaining || shouldYieldToHost!())) {
      // This currentTask hasn't expired, and we've reached the deadline.
      break;
    }
    const callback = currentTask.fn;
    if (callback !== null) {
      currentTask.fn = null;
      const didUserCallbackTimeout = currentTask.expirationTime <= currentTime;
      callback(didUserCallbackTimeout);
      currentTime = performance.now();
      if (currentTask === taskQueue[0]) {
        taskQueue.shift();
      }
    } else taskQueue.shift();
    currentTask = taskQueue[0] || null;
  }
  // Return whether there's additional work
  return currentTask !== null;
}

function flushWork(hasTimeRemaining: boolean, initialTime: number) {
  // We'll need a host callback the next time work is scheduled.
  isCallbackScheduled = false;
  isPerformingWork = true;
  try {
    return workLoop(hasTimeRemaining, initialTime);
  } finally {
    currentTask = null;
    isPerformingWork = false;
  }
}

export function requestCallback(fn: () => void, options?: { timeout?: number }): Task {
  if (!scheduleCallback) setupScheduler();
  const startTime = performance.now();
  let timeout = maxSigned31BitInt;

  if (options && options.timeout) timeout = options.timeout;

  const newTask: Task = {
    id: taskIdCounter++,
    fn,
    startTime,
    expirationTime: startTime + timeout,
  };

  enqueue(taskQueue, newTask);
  if (!isCallbackScheduled && !isPerformingWork) {
    isCallbackScheduled = true;
    scheduledCallback = flushWork;
    if (scheduleCallback) {
      scheduleCallback();
    }
  }

  return newTask;
}

export function cancelCallback(task: Task): void {
  task.fn = null;
}
