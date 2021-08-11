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
  addLinkedWorkDependency,
  addLinkedWorkDependent,
  createLinkedWork,
  destroyLinkedWork,
  LinkedWork,
  runLinkedWork,
  runLinkedWorkAlone,
  unlinkLinkedWorkDependencies,
} from '../linked-work';
import { cancelCallback, requestCallback, Task } from '../scheduler';
import {
  Cleanup,
  Effect,
  ErrorCapture,
  Ref,
} from './types';

// Execution contexts
let CLEANUP: Set<Cleanup> | undefined;
let TRACKING: LinkedWork | undefined;
let BATCH_UPDATES: Set<LinkedWork> | undefined;
let BATCH_EFFECTS: EffectWork[] | undefined;
let ERROR_BOUNDARY: ErrorBoundary | undefined;
let TRANSITION: Set<LinkedWork> | undefined;

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
  CLEANUP?.add(cleanup);
  return cleanup;
}

export function batchCleanup(callback: () => void | undefined | Cleanup): Cleanup {
  const cleanups = new Set<Cleanup>();
  const parentCleanup = CLEANUP;
  CLEANUP = cleanups;
  try {
    const cleanup = callback();
    // Add the returned cleanup as well
    if (cleanup) {
      cleanups.add(cleanup);
    }
  } finally {
    CLEANUP = parentCleanup;
  }
  // Create return cleanup
  return onCleanup(() => {
    untrack(() => {
      cleanups.forEach((cleanup) => {
        cleanup();
      });
      cleanups.clear();
    });
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
      try {
        untrack(() => {
          new Set(calls).forEach((handle) => {
            handle(error);
          });
        });
      } catch (newError) {
        handleError(parent, error);
        handleError(parent, newError);
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

function runWorkWithTransition(work: LinkedWork): void {
  runLinkedWorkAlone(work, TRANSITION);
}
function runWorkWithoutTransition(work: LinkedWork): void {
  runLinkedWorkAlone(work);
}

/**
 * Linked Work
 */

export interface ReactiveAtom extends LinkedWork {
  listeners?: Set<() => void>;
}

function revalidateAtom(target: ReactiveAtom): void {
  const { listeners } = target;
  if (listeners?.size) {
    // inlined
    createRoot(() => {
      listeners.forEach((listener) => {
        listener();
      });
    });
  }
}

export function createReactiveAtom(): ReactiveAtom {
  return createLinkedWork('atom', revalidateAtom);
}

export function trackReactiveAtom(target: ReactiveAtom): void {
  if (TRACKING) {
    addLinkedWorkDependent(target, TRACKING);
    addLinkedWorkDependency(TRACKING, target);
  }
}

export function notifyReactiveAtom(target: ReactiveAtom): void {
  const instance = new Set<LinkedWork>();
  const parent = BATCH_UPDATES;
  runLinkedWork(target, parent ?? instance);
  if (!parent) {
    BATCH_UPDATES = instance;
    instance.forEach(runWorkWithTransition);
    BATCH_UPDATES = undefined;
  }
}

function subscribeReactiveAtom(target: ReactiveAtom, listener: () => void): Cleanup {
  if (!target.listeners) {
    target.listeners = new Set();
  }
  target.listeners.add(listener);
  return () => {
    target.listeners?.delete(listener);
  };
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
    instance.forEach(runWorkWithTransition);
    BATCH_UPDATES = undefined;
  }
}

export interface Transition {
  start: (cb: () => void) => void;
  isPending: () => boolean;
}

export function createTransition(timeout?: number): Transition {
  const transitions: Set<LinkedWork> = new Set();
  let isPending = false;
  let task: Task | undefined;

  function schedule() {
    isPending = true;
    if (task) {
      cancelCallback(task);
    }
    task = requestCallback(() => {
      const parent = BATCH_UPDATES;
      BATCH_UPDATES = transitions;
      transitions.forEach(runWorkWithoutTransition);
      BATCH_UPDATES = parent;
      transitions.clear();
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
      const parent = TRANSITION;
      TRANSITION = transitions;
      try {
        // Unbatch first so that the scheduled updates
        // do not get pushed synchronously
        unbatch(callback);
      } finally {
        TRANSITION = parent;
      }

      schedule();
    },
    isPending() {
      return isPending;
    },
  };
}

interface EffectWork extends LinkedWork {
  callback: Effect;
  errorBoundary?: ErrorBoundary;
  cleanup?: Cleanup;
}

function cleanupEffect(node: EffectWork): void {
  if (node.alive) {
    unlinkLinkedWorkDependencies(node);

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
}

function stopEffect(node: EffectWork): void {
  if (node.alive) {
    cleanupEffect(node);
    destroyLinkedWork(node);
  }
}

function revalidateEffect(
  node: EffectWork,
): void {
  const parentTracking = TRACKING;
  const parentErrorBoundary = ERROR_BOUNDARY;
  const parentBatchEffects = BATCH_EFFECTS;
  ERROR_BOUNDARY = node.errorBoundary;
  BATCH_EFFECTS = undefined;
  TRACKING = node;
  try {
    batch(() => {
      cleanupEffect(node);
      node.cleanup = batchCleanup(node.callback);
    });
  } catch (error) {
    handleError(ERROR_BOUNDARY, error);
  } finally {
    TRACKING = parentTracking;
    BATCH_EFFECTS = parentBatchEffects;
    ERROR_BOUNDARY = parentErrorBoundary;
  }
}

const objAssign = Object.assign;

function createEffect(callback: Effect): EffectWork {
  const node = objAssign(
    createLinkedWork('effect', revalidateEffect as any),
    {
      callback,
      errorBoundary: ERROR_BOUNDARY,
    },
  );
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

const TRACK_MAP = new WeakMap<any, ReactiveAtom>();

export function registerTrackable<T>(
  atom: ReactiveAtom,
  trackable: T,
): void {
  TRACK_MAP.set(trackable, atom);
}

export function isTrackable<T>(
  trackable: T,
): boolean {
  return TRACK_MAP.has(trackable);
}

export function getTrackableAtom<T>(
  trackable: T,
): ReactiveAtom | undefined {
  return TRACK_MAP.get(trackable);
}

interface ComputedWork extends LinkedWork {
  compute: () => any;
  value?: Ref<any>;
  errorBoundary?: ErrorBoundary;
}

function revalidateComputed(target: ComputedWork): void {
  unlinkLinkedWorkDependencies(target);
  const parentTracking = TRACKING;
  const parentErrorBoundary = ERROR_BOUNDARY;
  TRACKING = target;
  ERROR_BOUNDARY = target.errorBoundary;
  try {
    target.value = {
      value: target.compute(),
    };
  } catch (error) {
    handleError(target.errorBoundary, error);
  } finally {
    ERROR_BOUNDARY = parentErrorBoundary;
    TRACKING = parentTracking;
  }
  revalidateAtom(target);
}

export function computed<T>(compute: () => T): Ref<T> {
  const work: ComputedWork = {
    ...createLinkedWork('computed', revalidateComputed as any),
    compute,
    errorBoundary: ERROR_BOUNDARY,
  };

  runLinkedWork(work);

  onCleanup(() => {
    destroyLinkedWork(work);
  });

  const ref = {
    get value() {
      trackReactiveAtom(work);
      if (work.value) {
        return work.value.value;
      }
      throw new Error('failed computed');
    },
  };

  registerTrackable(work, ref);

  return ref;
}

export function track<T>(source: T): T {
  const atom = getTrackableAtom(source);
  if (atom) {
    trackReactiveAtom(atom);
  }
  return source;
}

export function watch<T>(source: T, listen: () => void, run = false): () => void {
  const atom = getTrackableAtom(source);
  if (atom) {
    if (run) {
      createRoot(listen);
    }
    return onCleanup(subscribeReactiveAtom(atom, listen));
  }
  throw new Error('Invalid trackable for `watch`. Received value is not a reactive value.');
}
