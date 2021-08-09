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
let BATCH_UPDATES: LinkedWork[] | undefined;
let BATCH_EFFECTS: EffectNode[] | undefined;
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

export function onCleanup(cleanup: Cleanup): void {
  CLEANUP?.add(cleanup);
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
  const returnCleanup = () => {
    untrack(() => {
      cleanups.forEach((cleanup) => {
        cleanup();
      });
      cleanups.clear();
    });
  };
  onCleanup(returnCleanup);
  return returnCleanup;
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
    if (instance.calls?.size) {
      try {
        untrack(() => {
          new Set(instance.calls).forEach((handle) => {
            handle(error);
          });
        });
      } catch (newError) {
        handleError(instance.parent, error);
        handleError(instance.parent, newError);
      }
    } else {
      handleError(instance.parent, error);
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

export function onError(errorCapture: ErrorCapture): void {
  if (ERROR_BOUNDARY) {
    onCleanup(registerErrorCapture(ERROR_BOUNDARY, errorCapture));
  }
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

export interface ReactiveAtom extends LinkedWork {
  listeners?: Set<() => void>;
  pending?: boolean;
}

export function createReactiveAtom(): ReactiveAtom {
  const atom: ReactiveAtom = createLinkedWork(() => {
    if (atom.listeners?.size) {
      const { listeners } = atom;
      // inlined
      untrack(() => {
        listeners.forEach((listener) => {
          listener();
        });
      });
    }
  });

  return atom;
}

export function trackReactiveAtom(target: ReactiveAtom): void {
  if (TRACKING) {
    addLinkedWorkDependent(target, TRACKING);
    addLinkedWorkDependency(TRACKING, target);
  }
}

export function notifyReactiveAtom(target: ReactiveAtom): void {
  if (BATCH_UPDATES) {
    if (!target.pending) {
      target.pending = true;
      BATCH_UPDATES.push(target);
    }
  } else if (TRANSITION) {
    TRANSITION.add(target);
  } else {
    target.pending = false;
    runLinkedWork(target);
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
  const batchedWork: ReactiveAtom[] = [];
  const parent = BATCH_UPDATES;
  BATCH_UPDATES = batchedWork;
  try {
    callback();
  } finally {
    BATCH_UPDATES = parent;
  }
  for (let i = 0; i < batchedWork.length; i += 1) {
    notifyReactiveAtom(batchedWork[i]);
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
    if (!isPending) {
      isPending = true;
      task = requestCallback(() => {
        transitions.forEach((transition) => {
          runLinkedWork(transition);
        });
        transitions.clear();
        isPending = false;
      }, { timeout });
    }
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
        unbatch(() => {
          callback();
        });
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

interface EffectNode extends LinkedWork {
  errorBoundary?: ErrorBoundary;
  cleanup?: Cleanup;
}

function cleanupEffect(node: EffectNode): void {
  if (node.alive) {
    unlinkLinkedWorkDependencies(node);

    if (node.cleanup) {
      try {
        node.cleanup();
      } catch (error) {
        handleError(node.errorBoundary, error);
      }

      node.cleanup = undefined;
    }
  }
}

function stopEffect(node: EffectNode): void {
  if (node.alive) {
    cleanupEffect(node);
    destroyLinkedWork(node);
  }
}

function revalidateEffect(
  node: EffectNode,
  callback: Effect,
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
      node.cleanup = batchCleanup(callback);
    });
  } catch (error) {
    handleError(node.errorBoundary, error);
  } finally {
    TRACKING = parentTracking;
    BATCH_EFFECTS = parentBatchEffects;
    ERROR_BOUNDARY = parentErrorBoundary;
  }
}

function createEffect(callback: Effect): EffectNode {
  const node = Object.assign(
    createLinkedWork(() => {
      revalidateEffect(node, callback);
    }),
    {
      errorBoundary: ERROR_BOUNDARY,
    },
  );
  return node;
}

export function batchEffects(callback: () => void): () => void {
  const batchedEffects: EffectNode[] = [];
  const parent = BATCH_EFFECTS;
  BATCH_EFFECTS = batchedEffects;
  try {
    callback();
  } finally {
    BATCH_EFFECTS = parent;
  }
  return () => {
    for (let i = 0; i < batchedEffects.length; i += 1) {
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

  const cleanup = () => {
    stopEffect(instance);
  };

  onCleanup(cleanup);

  return cleanup;
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

export function computed<T>(compute: () => T): Ref<T> {
  let val: Ref<T> | undefined;

  const currentErrorBoundary = ERROR_BOUNDARY;
  const atom = createReactiveAtom();

  const work = createLinkedWork(() => {
    unlinkLinkedWorkDependencies(work);
    const parentTracking = TRACKING;
    const parentErrorBoundary = ERROR_BOUNDARY;
    TRACKING = work;
    ERROR_BOUNDARY = currentErrorBoundary;
    try {
      val = {
        value: compute(),
      };
    } catch (error) {
      handleError(currentErrorBoundary, error);
    } finally {
      ERROR_BOUNDARY = parentErrorBoundary;
      TRACKING = parentTracking;
    }
    notifyReactiveAtom(atom);
  });

  runLinkedWork(work);

  onCleanup(() => {
    destroyLinkedWork(work);
  });

  const ref = {
    get value() {
      trackReactiveAtom(atom);
      if (val) {
        return val.value;
      }
      throw new Error('failed computed');
    },
  };

  registerTrackable(atom, ref);

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
    const wrappedListener = () => createRoot(listen);
    if (run) {
      wrappedListener();
    }
    const cleanup = subscribeReactiveAtom(atom, wrappedListener);
    onCleanup(cleanup);
    return cleanup;
  }
  throw new Error('Invalid trackable for `watch`. Received value is not a reactive value.');
}
