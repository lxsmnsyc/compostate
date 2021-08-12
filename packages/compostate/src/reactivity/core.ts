/**
 * @license
 * MIT License
 *
 * Copyright (c) 2021 Alexis Munsayac
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 *
 * @author Alexis Munsayac <alexis.munsayac@gmail.com>
 * @copyright Alexis Munsayac 2021
 */
import {
  createLinkedWork,
  destroyLinkedWork,
  LinkedWork,
  linkLinkedWork,
  runLinkedWork,
  runLinkedWorkAlone,
  setRunner,
  unlinkLinkedWorkPublishers,
} from '../linked-work';
import { cancelCallback, requestCallback, Task } from '../scheduler';
import {
  Cleanup,
  Effect,
  ErrorCapture,
  Ref,
} from './types';

const { is, assign } = Object;

// Execution contexts
let CLEANUP: Cleanup[] | undefined;
let TRACKING: LinkedWork | undefined;
let BATCH_UPDATES: Set<LinkedWork> | undefined;
let BATCH_EFFECTS: EffectWork[] | undefined;
let ERROR_BOUNDARY: ErrorBoundary | undefined;

export function unbatch<T>(callback: () => T): T {
  const parent = BATCH_UPDATES;
  BATCH_UPDATES = undefined;
  try {
    return callback();
  } finally {
    BATCH_UPDATES = parent;
  }
}

export function unbatchCleanup<T>(callback: () => T): T {
  const parent = CLEANUP;
  CLEANUP = undefined;
  try {
    return callback();
  } finally {
    CLEANUP = parent;
  }
}

export function unbatchEffects<T>(callback: () => T): T {
  const parent = BATCH_EFFECTS;
  BATCH_EFFECTS = undefined;
  try {
    return callback();
  } finally {
    BATCH_EFFECTS = parent;
  }
}

export function untrack<T>(callback: () => T): T {
  const parent = TRACKING;
  TRACKING = undefined;
  try {
    return callback();
  } finally {
    TRACKING = parent;
  }
}

export function createRoot<T>(callback: () => T): T {
  const parentBatchUpdates = BATCH_UPDATES;
  const parentBatchEffects = BATCH_EFFECTS;
  const parentTracking = TRACKING;
  const parentCleanup = CLEANUP;
  BATCH_UPDATES = undefined;
  BATCH_EFFECTS = undefined;
  TRACKING = undefined;
  CLEANUP = undefined;
  try {
    return callback();
  } finally {
    CLEANUP = parentCleanup;
    TRACKING = parentTracking;
    BATCH_EFFECTS = parentBatchEffects;
    BATCH_UPDATES = parentBatchUpdates;
  }
}

export function capturedBatchCleanup<T extends any[], R>(
  callback: (...args: T) => R,
): (...args: T) => R {
  const current = CLEANUP;
  return (...args) => {
    const parent = CLEANUP;
    CLEANUP = current;
    try {
      return callback(...args);
    } finally {
      CLEANUP = parent;
    }
  };
}

export function capturedErrorBoundary<T extends any[], R>(
  callback: (...args: T) => R,
): (...args: T) => R {
  const current = ERROR_BOUNDARY;
  return (...args) => {
    const parent = ERROR_BOUNDARY;
    ERROR_BOUNDARY = current;
    try {
      return callback(...args);
    } finally {
      ERROR_BOUNDARY = parent;
    }
  };
}

export function onCleanup(cleanup: Cleanup): Cleanup {
  CLEANUP?.push(cleanup);
  return cleanup;
}

export function batchCleanup(callback: () => void | undefined | Cleanup): Cleanup {
  const cleanups: Cleanup[] = [];
  const parentCleanup = CLEANUP;
  CLEANUP = cleanups;
  try {
    const cleanup = callback();
    // Add the returned cleanup as well
    if (cleanup) {
      cleanups.push(cleanup);
    }
  } finally {
    CLEANUP = parentCleanup;
  }
  let alive = true;
  // Create return cleanup
  return onCleanup(() => {
    if (!alive) {
      return;
    }
    alive = false;
    const len = cleanups.length;
    if (cleanups.length) {
      const parent = TRACKING;
      TRACKING = undefined;
      try {
        for (let i = 0; i < len; i++) {
          cleanups[i]();
        }
      } finally {
        TRACKING = parent;
      }
    }
  });
}

// ErrorBoundary
interface ErrorBoundary {
  calls?: Set<ErrorCapture>;
  parent?: ErrorBoundary;
}

function createErrorBoundary(parent?: ErrorBoundary): ErrorBoundary {
  return { parent };
}

function handleError(instance: ErrorBoundary | undefined, error: Error): void {
  if (instance) {
    const { calls, parent } = instance;
    if (calls?.size) {
      const parentTracking = TRACKING;
      TRACKING = undefined;
      try {
        const copy = new Set(calls);
        for (const handle of copy) {
          handle(error);
        }
      } catch (newError) {
        handleError(parent, error);
        handleError(parent, newError);
      } finally {
        TRACKING = parentTracking;
      }
    } else {
      handleError(parent, error);
    }
  } else {
    throw error;
  }
}

function registerErrorCapture(
  instance: ErrorBoundary,
  capture: ErrorCapture,
): Cleanup {
  if (!instance.calls) {
    instance.calls = new Set();
  }
  instance.calls.add(capture);
  return () => {
    instance.calls?.delete(capture);
  };
}

function NO_OP() {
  // no-op
}

export function onError(errorCapture: ErrorCapture): Cleanup {
  if (ERROR_BOUNDARY) {
    return onCleanup(registerErrorCapture(ERROR_BOUNDARY, errorCapture));
  }
  return NO_OP;
}

export function errorBoundary<T>(callback: () => T): T {
  const parentInstance = ERROR_BOUNDARY;
  ERROR_BOUNDARY = createErrorBoundary(parentInstance);
  try {
    return callback();
  } finally {
    ERROR_BOUNDARY = parentInstance;
  }
}

export function captureError(): ErrorCapture {
  const boundary = ERROR_BOUNDARY;
  return (error) => {
    handleError(boundary, error);
  };
}

/**
 * Linked Work
 */
export type ReactiveAtom = LinkedWork;

export function createReactiveAtom(): ReactiveAtom {
  return createLinkedWork('atom');
}

export function trackReactiveAtom(target: ReactiveAtom): void {
  if (TRACKING) {
    linkLinkedWork(target, TRACKING);
  }
}

export function notifyReactiveAtom(target: ReactiveAtom): void {
  const instance = new Set<LinkedWork>();
  const parent = BATCH_UPDATES;
  runLinkedWork(target, parent ?? instance);
  if (!parent) {
    BATCH_UPDATES = instance;
    for (const work of instance) {
      runLinkedWorkAlone(work);
    }
    BATCH_UPDATES = undefined;
  }
}

export function batch(callback: () => void): void {
  const instance = new Set<LinkedWork>();
  const parent = BATCH_UPDATES;
  BATCH_UPDATES = parent ?? instance;
  try {
    callback();
  } finally {
    BATCH_UPDATES = parent;
  }
  if (!parent) {
    BATCH_UPDATES = instance;
    for (const work of instance) {
      runLinkedWorkAlone(work);
    }
    BATCH_UPDATES = undefined;
  }
}

export interface Transition {
  start: (cb: () => void) => void;
  isPending: () => boolean;
}

export function createTransition(timeout?: number): Transition {
  const transitions = new Set<LinkedWork>();
  let isPending = false;
  let task: Task | undefined;

  function schedule() {
    isPending = true;
    if (task) {
      cancelCallback(task);
    }
    task = requestCallback(() => {
      if (transitions.size) {
        BATCH_UPDATES = transitions;
        for (const work of transitions) {
          runLinkedWorkAlone(work);
        }
        BATCH_UPDATES = undefined;
        transitions.clear();
      }
      isPending = false;
      task = undefined;
    }, { timeout });
  }

  onCleanup(() => {
    if (task) {
      cancelCallback(task);
    }
  });

  return {
    start(callback: () => void) {
      const parent = BATCH_UPDATES;
      BATCH_UPDATES = transitions;
      try {
        // Unbatch first so that the scheduled updates
        // do not get pushed synchronously
        callback();
      } finally {
        BATCH_UPDATES = parent;
      }

      schedule();
    },
    isPending() {
      return isPending;
    },
  };
}

interface ComputationWork<T> extends LinkedWork {
  process: (prev?: T) => T;
  current?: T;
}

export function computation<T>(callback: (prev?: T) => T): Cleanup {
  const work: ComputationWork<T> = assign(createLinkedWork('computation'), {
    process: callback,
    errorBoundary: ERROR_BOUNDARY,
  });

  runLinkedWork(work);

  return onCleanup(() => {
    destroyLinkedWork(work);
  });
}

interface EffectWork extends ProcessWork {
  callback: Effect;
  cleanup?: Cleanup;
}

function cleanupEffect(node: EffectWork): void {
  const currentCleanup = node.cleanup;
  if (currentCleanup) {
    try {
      currentCleanup();
    } catch (error) {
      handleError(node.errorBoundary, error);
    }

    node.cleanup = undefined;
  }
}

function stopEffect(node: EffectWork): void {
  if (node.alive) {
    cleanupEffect(node);
    destroyLinkedWork(node);
  }
}

function createEffect(callback: Effect): EffectWork {
  const node = assign(createLinkedWork('effect'), {
    callback,
    errorBoundary: ERROR_BOUNDARY,
  });
  return node;
}

export function batchEffects(callback: () => void): () => void {
  const batchedEffects: EffectWork[] = [];
  const parent = BATCH_EFFECTS;
  BATCH_EFFECTS = batchedEffects;
  try {
    callback();
  } finally {
    BATCH_EFFECTS = parent;
  }
  return () => {
    for (let i = 0, len = batchedEffects.length; i < len; i++) {
      runLinkedWork(batchedEffects[i]);
    }
  };
}

export function effect(callback: Effect): Cleanup {
  const instance = createEffect(callback);

  if (BATCH_EFFECTS) {
    BATCH_EFFECTS.push(instance);
  } else {
    runLinkedWork(instance);
  }

  return onCleanup(() => {
    stopEffect(instance);
  });
}

const TRACKABLE = Symbol('COMPOSTATE_TRACKABLE');

type Trackable = Record<typeof TRACKABLE, ReactiveAtom | undefined>;

export function registerTrackable<T>(
  instance: ReactiveAtom,
  trackable: T,
): T {
  (trackable as unknown as Trackable)[TRACKABLE] = instance;
  return trackable;
}

export function isTrackable<T>(
  trackable: T,
): boolean {
  return TRACKABLE in trackable;
}

export function getTrackableAtom<T>(
  trackable: T,
): ReactiveAtom | undefined {
  return (trackable as unknown as Trackable)[TRACKABLE];
}

interface WatchWork<T> extends LinkedWork {
  source: () => T,
  listen: (next: T, prev?: T) => void,
  current?: T;
  errorBoundary?: ErrorBoundary;
}

export function watch<T>(
  source: () => T,
  listen: (next: T, prev?: T) => void,
): () => void {
  const work: WatchWork<T> = assign(createLinkedWork('watch'), {
    source,
    listen,
    errorBoundary: ERROR_BOUNDARY,
  });

  runLinkedWork(work);

  return onCleanup(() => {
    destroyLinkedWork(work);
  });
}

interface ComputedWork extends LinkedWork {
  compute: () => any;
  value?: Ref<any>;
  errorBoundary?: ErrorBoundary;
}

export function computed<T>(compute: () => T): Ref<T> {
  const work: ComputedWork = assign(createLinkedWork('computed'), {
    compute,
    errorBoundary: ERROR_BOUNDARY,
  });

  runLinkedWork(work);

  onCleanup(() => {
    destroyLinkedWork(work);
  });

  return registerTrackable(work, {
    get value() {
      trackReactiveAtom(work);
      if (work.value) {
        return work.value.value;
      }
      throw new Error('failed computed');
    },
  });
}

export function track<T>(source: T): T {
  const instance = getTrackableAtom(source);
  if (instance) {
    trackReactiveAtom(instance);
  }
  return source;
}

class RefNode<T> {
  private val: T;

  private instance: ReactiveAtom;

  constructor(value: T, instance: ReactiveAtom) {
    this.val = value;
    this.instance = instance;
  }

  get value() {
    trackReactiveAtom(this.instance);
    return this.val;
  }

  set value(next: T) {
    if (!is(next, this.val)) {
      this.val = next;
      notifyReactiveAtom(this.instance);
    }
  }
}

export function ref<T>(value: T): Ref<T> {
  const instance = createReactiveAtom();
  return registerTrackable(instance, new RefNode(value, instance));
}

interface ProcessWork extends LinkedWork {
  errorBoundary?: ErrorBoundary;
}

function runComputationProcess(target: ComputationWork<any>) {
  batch(() => {
    target.current = target.process(target.current);
  });
}

function runWatchProcess(target: WatchWork<any>) {
  const hasCurrent = 'current' in target;
  const next = target.source();
  const prev = target.current;
  if ((hasCurrent && !is(next, target.current)) || !hasCurrent) {
    target.current = next;
    batch(() => {
      target.listen(next, prev);
    });
  }
}

function runEffectProcess(target: EffectWork) {
  const parentBatchEffects = BATCH_EFFECTS;
  BATCH_EFFECTS = undefined;
  try {
    batch(() => {
      cleanupEffect(target);
      target.cleanup = batchCleanup(target.callback);
    });
  } finally {
    BATCH_EFFECTS = parentBatchEffects;
  }
}

function runComputedProcess(target: ComputedWork) {
  target.value = {
    value: target.compute(),
  };
}

function runProcess(target: ProcessWork) {
  unlinkLinkedWorkPublishers(target);
  const parentTracking = TRACKING;
  const parentErrorBoundary = ERROR_BOUNDARY;
  TRACKING = target;
  ERROR_BOUNDARY = target.errorBoundary;
  try {
    switch (target.tag) {
      case 'computation':
        runComputationProcess(target as ComputationWork<any>);
        break;
      case 'watch':
        runWatchProcess(target as WatchWork<any>);
        break;
      case 'effect':
        runEffectProcess(target as EffectWork);
        break;
      case 'computed':
        runComputedProcess(target as ComputedWork);
        break;
      case 'atom':
      default:
        break;
    }
  } catch (error) {
    handleError(target.errorBoundary, error);
  } finally {
    ERROR_BOUNDARY = parentErrorBoundary;
    TRACKING = parentTracking;
  }
}

setRunner(runProcess);
