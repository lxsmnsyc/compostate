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
  enqueuePublisherWork,
  enqueueSubscriberWork,
  evaluatePublisherWork,
  evaluateSubscriberWork,
  LinkedWork,
  publisherLinkSubscriber,
  setRunner,
  unlinkLinkedWorkPublishers,
} from '../linked-work';
import {
  cancelCallback,
  requestCallback,
  Task,
} from '../scheduler';
import {
  Cleanup,
  Effect,
  ErrorCapture,
  Ref,
} from './types';

const { is, assign } = Object;

// Work types
const WORK_ATOM = 0b00000001;
const WORK_COMPUTATION = 0b00000010;
const WORK_EFFECT = 0b00000100;
const WORK_SYNC_EFFECT = 0b00001000;

// Execution contexts

// Context for whether the scope is tracking for subscribers
export let TRACKING: LinkedWork | undefined;
// Context for whether the updates are being batched
let BATCH_UPDATES: Set<LinkedWork> | undefined;
// Context for whether or not there is an error boundary
let ERROR_BOUNDARY: ErrorBoundary | undefined;
// Context for whether there is a context instance
let CONTEXT: ContextTree | undefined;
// Context for whether there is a cleanup boundary
export let CLEANUP: Set<Cleanup> | undefined;

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
  const parentTracking = TRACKING;
  const parentCleanup = CLEANUP;
  BATCH_UPDATES = undefined;
  TRACKING = undefined;
  CLEANUP = undefined;
  try {
    return callback();
  } finally {
    CLEANUP = parentCleanup;
    TRACKING = parentTracking;
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

export function capturedContext<T extends any[], R>(
  callback: (...args: T) => R,
): (...args: T) => R {
  const current = CONTEXT;
  return (...args) => {
    const parent = CONTEXT;
    CONTEXT = current;
    try {
      return callback(...args);
    } finally {
      CONTEXT = parent;
    }
  };
}

export function captured<T extends any[], R>(
  callback: (...args: T) => R,
): (...args: T) => R {
  const currentErrorBoundary = ERROR_BOUNDARY;
  const currentCleanup = CLEANUP;
  const currentContext = CONTEXT;
  return (...args) => {
    const parentErrorBoundary = ERROR_BOUNDARY;
    const parentCleanup = CLEANUP;
    const parentContext = CONTEXT;
    ERROR_BOUNDARY = currentErrorBoundary;
    CLEANUP = currentCleanup;
    CONTEXT = currentContext;
    try {
      return callback(...args);
    } finally {
      CONTEXT = parentContext;
      CLEANUP = parentCleanup;
      ERROR_BOUNDARY = parentErrorBoundary;
    }
  };
}

export function onCleanup(cleanup: Cleanup): Cleanup {
  if (CLEANUP) {
    CLEANUP.add(cleanup);
  }
  return cleanup;
}

function exhaustCleanup(
  cleanups: Set<Cleanup>,
): void {
  for (const cleanup of cleanups) {
    cleanup();
  }
}

export function batchCleanup(callback: () => void): Cleanup {
  const cleanups = new Set<Cleanup>();
  const parentCleanup = CLEANUP;
  CLEANUP = cleanups;
  try {
    callback();
  } finally {
    CLEANUP = parentCleanup;
  }
  let alive = true;
  // Create return cleanup
  return onCleanup(() => {
    if (alive) {
      alive = false;
      if (cleanups.size) {
        // Untrack before running cleanups
        const parent = TRACKING;
        TRACKING = undefined;
        try {
          exhaustCleanup(cleanups);
        } finally {
          TRACKING = parent;
        }
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

function runErrorHandlers(calls: IterableIterator<ErrorCapture>, error: unknown): void {
  for (const item of calls) {
    item(error);
  }
}

function handleError(instance: ErrorBoundary | undefined, error: unknown): void {
  if (instance) {
    const { calls, parent } = instance;
    // Check if the current boundary has listeners
    if (calls && calls.size) {
      // Untrack before passing error
      const parentTracking = TRACKING;
      TRACKING = undefined;
      try {
        runErrorHandlers(calls.keys(), error);
      } catch (value) {
        // If the error handler fails, forward the new error and the current error
        handleError(parent, value);
        handleError(parent, error);
      } finally {
        TRACKING = parentTracking;
      }
    } else {
      // Forward the error to the parent
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
    if (instance.calls) {
      instance.calls.delete(capture);
    }
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
  return createLinkedWork(false, WORK_ATOM);
}

export function destroyReactiveAtom(target: ReactiveAtom): void {
  destroyLinkedWork(target);
}

export function captureReactiveAtomForCleanup(instance: ReactiveAtom): void {
  if (CLEANUP) {
    CLEANUP.add(() => destroyLinkedWork(instance));
  }
}

export function trackReactiveAtom(target: ReactiveAtom): void {
  publisherLinkSubscriber(target, TRACKING!);
}

function exhaustUpdates(instance: Set<LinkedWork>): void {
  for (const work of instance) {
    if (work.alive) {
      if (work.isSubscriber) {
        evaluateSubscriberWork(work);
      } else {
        evaluatePublisherWork(work);
      }
    }
  }
}

function runUpdates(instance: Set<LinkedWork>) {
  BATCH_UPDATES = instance;
  try {
    exhaustUpdates(instance);
  } finally {
    BATCH_UPDATES = undefined;
  }
}

export function notifyReactiveAtom(target: ReactiveAtom): void {
  if (target.alive) {
    if (BATCH_UPDATES) {
      enqueuePublisherWork(target, BATCH_UPDATES);
    } else {
      const instance = new Set<LinkedWork>();
      enqueuePublisherWork(target, instance);
      runUpdates(instance);
    }
  }
}

export function batch<T extends any[]>(
  callback: (...arg: T) => void,
  ...args: T
): void {
  if (BATCH_UPDATES) {
    callback(...args);
  } else {
    const instance = new Set<LinkedWork>();
    BATCH_UPDATES = instance;
    try {
      callback(...args);
    } finally {
      BATCH_UPDATES = undefined;
    }
    runUpdates(instance);
  }
}

function cleanProcess(work: ProcessWork): void {
  if (work.cleanup) {
    batch(work.cleanup);
    work.cleanup = undefined;
  }
  work.context = undefined;
  work.errorBoundary = undefined;
}

interface ComputationWork<T> extends ProcessWork {
  process?: (prev?: T) => T;
  current?: T;
}

export function computation<T>(callback: (prev?: T) => T, initial?: T): Cleanup {
  const work: ComputationWork<T> = assign(createLinkedWork(true, WORK_COMPUTATION), {
    current: initial,
    process: callback,
    context: CONTEXT,
    errorBoundary: ERROR_BOUNDARY,
  });

  evaluateSubscriberWork(work);

  return onCleanup(() => {
    if (work.alive) {
      cleanProcess(work);
      work.process = undefined;
      destroyLinkedWork(work);
    }
  });
}

interface SyncEffectWork extends ProcessWork {
  callback?: Effect;
  cleanup?: Cleanup;
}

export function syncEffect(callback: Effect): Cleanup {
  const work: SyncEffectWork = assign(createLinkedWork(true, WORK_SYNC_EFFECT), {
    callback,
    context: CONTEXT,
    errorBoundary: ERROR_BOUNDARY,
  });

  evaluateSubscriberWork(work);

  return onCleanup(() => {
    if (work.alive) {
      cleanProcess(work);
      work.callback = undefined;
      destroyLinkedWork(work);
    }
  });
}
interface EffectWork extends ProcessWork {
  callback?: Effect;
  cleanup?: Cleanup;
  timeout?: ReturnType<typeof requestCallback>;
}

export function effect(callback: Effect): Cleanup {
  const work: EffectWork = assign(createLinkedWork(true, WORK_EFFECT), {
    callback,
    context: CONTEXT,
    errorBoundary: ERROR_BOUNDARY,
  });

  evaluateSubscriberWork(work);

  return onCleanup(() => {
    if (work.alive) {
      cleanProcess(work);
      if (work.timeout) {
        cancelCallback(work.timeout);
      }
      work.timeout = undefined;
      work.callback = undefined;
      destroyLinkedWork(work);
    }
  });
}

interface WatchRef<T> {
  current: T;
}

export function watch<T, R>(
  source: () => T,
  listen: (next: T, prev?: T) => R,
  isEqual: (next: T, prev: T) => boolean = is,
): () => R {
  let ref: WatchRef<T> | undefined;
  let result: WatchRef<R> | undefined;
  let cleanup: Cleanup | undefined;

  return () => {
    const next = source();
    const prev = ref?.current;
    if ((ref && !isEqual(next, ref.current)) || !ref) {
      if (cleanup) {
        cleanup();
      }
      cleanup = batchCleanup(() => {
        ref = { current: next };
        result = { current: listen(next, prev) };
      });
    }
    if (!result) {
      throw new Error('Unexpected missing result');
    }
    return result.current;
  };
}

export type Signal<T> = [
  () => T,
  (value: T) => void,
];

export function signal<T>(
  value: T,
  isEqual: (next: T, prev: T) => boolean = is,
): Signal<T> {
  const instance = createReactiveAtom();
  captureReactiveAtomForCleanup(instance);
  return [
    () => {
      if (TRACKING) {
        trackReactiveAtom(instance);
      }
      return value;
    },
    (next) => {
      if (!isEqual(next, value)) {
        value = next;
        notifyReactiveAtom(instance);
      }
    },
  ];
}

export interface Atom<T> {
  (): T;
  (next: T): T;
}

export function atom<T>(value: T, isEqual: (next: T, prev: T) => boolean = is): Atom<T> {
  const instance = createReactiveAtom();
  captureReactiveAtomForCleanup(instance);
  return (...args: [] | [T]) => {
    if (args.length === 1) {
      const next = args[0];
      if (!isEqual(next, value)) {
        value = next;
        notifyReactiveAtom(instance);
      }
    } else if (TRACKING) {
      trackReactiveAtom(instance);
    }
    return value;
  };
}

export function computed<T>(
  compute: () => T,
  isEqual: (next: T, prev: T) => boolean = is,
): () => T {
  const instance = createReactiveAtom();
  captureReactiveAtomForCleanup(instance);

  let value: T;
  let initial = true;
  let doSetup = true;

  const setup = captured(() => {
    syncEffect(
      watch(compute, (current) => {
        value = current;
        if (initial) {
          initial = false;
        } else {
          notifyReactiveAtom(instance);
        }
      }, isEqual),
    );
  });

  return () => {
    if (doSetup) {
      setup();
      doSetup = false;
    }
    if (TRACKING) {
      trackReactiveAtom(instance);
    }
    return value;
  };
}

function processWork(target: ProcessWork, work: (target: ProcessWork) => void) {
  unlinkLinkedWorkPublishers(target);
  const parentContext = CONTEXT;
  const parentTracking = TRACKING;
  const parentErrorBoundary = ERROR_BOUNDARY;
  ERROR_BOUNDARY = target.errorBoundary;
  TRACKING = target;
  CONTEXT = target.context;
  try {
    work(target);
  } catch (value) {
    handleError(target.errorBoundary, value);
  } finally {
    CONTEXT = parentContext;
    TRACKING = parentTracking;
    ERROR_BOUNDARY = parentErrorBoundary;
  }
}

interface ProcessWork extends LinkedWork {
  cleanup?: Cleanup;
  errorBoundary?: ErrorBoundary;
  context?: ContextTree;
}

function runComputationProcessInternal<T>(
  target: ComputationWork<T>,
  process: (prev?: T) => T,
) {
  if (target.cleanup) {
    target.cleanup();
  }
  target.cleanup = batchCleanup(() => {
    target.current = process(target.current);
  });
}

function runComputationProcess(target: ComputationWork<any>) {
  const { process } = target;
  if (process) {
    batch(runComputationProcessInternal, target, process);
  }
}

function runSyncEffectProcessInternal(
  target: SyncEffectWork,
  callback: Effect,
) {
  if (target.cleanup) {
    target.cleanup();
  }
  target.cleanup = batchCleanup(callback);
}

function runSyncEffectProcess(target: SyncEffectWork) {
  const { callback } = target;
  if (callback) {
    batch(runSyncEffectProcessInternal, target, callback);
  }
}

function runEffectProcess(target: EffectWork) {
  const newCallback = captured(() => {
    processWork(target, runSyncEffectProcess);
  });

  if (target.timeout) {
    cancelCallback(target.timeout);
  }
  target.timeout = requestCallback(newCallback);
}

function runProcess(target: ProcessWork) {
  switch (target.tag) {
    case WORK_COMPUTATION:
      processWork(target, runComputationProcess);
      break;
    case WORK_EFFECT:
      runEffectProcess(target as EffectWork);
      break;
    case WORK_SYNC_EFFECT:
      processWork(target, runSyncEffectProcess);
      break;
    default:
      break;
  }
}

setRunner(runProcess);

interface ContextTree {
  parent?: ContextTree;
  data: Record<string, Ref<any> | undefined>;
}

export function contextual<T>(callback: () => T): T {
  const parent = CONTEXT;
  CONTEXT = {
    parent,
    data: {},
  };
  try {
    return callback();
  } finally {
    CONTEXT = parent;
  }
}

export interface Context<T> {
  id: number;
  defaultValue: T;
}

let CONTEXT_ID = 0;

export function createContext<T>(defaultValue: T): Context<T> {
  return {
    id: CONTEXT_ID++,
    defaultValue,
  };
}

export function writeContext<T>(context: Context<T>, value: T): void {
  const parent = CONTEXT;
  if (parent) {
    parent.data[context.id] = { value };

    // If provide is called in a linked work,
    // make sure to delete the written data.
    if (CLEANUP) {
      CLEANUP.add(() => {
        parent.data[context.id] = undefined;
      });
    }
  }
}

export function readContext<T>(context: Context<T>): T {
  let current = CONTEXT;
  while (current) {
    const currentData = current.data[context.id];
    if (currentData) {
      return currentData.value;
    }
    if (CONTEXT) {
      current = CONTEXT.parent;
    } else {
      break;
    }
  }
  return context.defaultValue;
}

export function selector<T, U extends T>(
  source: () => T,
  isEqual: (a: U, b: T) => boolean = is,
): (item: U) => boolean {
  const subs = new Map<U, Set<LinkedWork>>();
  let v: T;
  syncEffect(
    watch(source, (current, prev) => {
      for (const key of subs.keys()) {
        if (isEqual(key, current) || (prev !== undefined && isEqual(key, prev))) {
          const listeners = subs.get(key);
          if (listeners && listeners.size) {
            for (const listener of listeners) {
              if (listener.alive) {
                enqueueSubscriberWork(listener, BATCH_UPDATES!);
              }
            }
          }
        }
      }
      v = current;
    }),
  );
  return (key: U) => {
    const current = TRACKING;
    if (current) {
      let listeners: Set<LinkedWork>;
      const currentListeners = subs.get(key);
      if (currentListeners) {
        listeners = currentListeners;
      } else {
        listeners = new Set([current]);
        subs.set(key, listeners);
      }
      if (CLEANUP) {
        CLEANUP.add(() => {
          if (listeners.size > 1) {
            listeners.delete(current);
          } else {
            subs.delete(key);
          }
        });
      }
    }
    return isEqual(key, v);
  };
}

const TRANSITIONS = new Set<LinkedWork>();
const [readTransitionPending, writeTransitionPending] = signal(false);
let task: Task | undefined;

function flushTransition() {
  writeTransitionPending(false);
  task = undefined;
  if (TRANSITIONS.size) {
    const transitions = new Set(TRANSITIONS);
    // Clear the original so that
    // the next transitions are
    // deferred
    TRANSITIONS.clear();
    runUpdates(transitions);
  }
}

function scheduleTransition() {
  writeTransitionPending(true);
  if (task) {
    cancelCallback(task);
  }
  task = requestCallback(flushTransition);
}

export function startTransition(callback: () => void): void {
  const parent = BATCH_UPDATES;
  BATCH_UPDATES = TRANSITIONS;
  try {
    callback();
  } finally {
    BATCH_UPDATES = parent;
  }
  scheduleTransition();
}

export function isTransitionPending(): boolean {
  return readTransitionPending();
}

export function deferred<T>(
  callback: () => T,
  isEqual: (next: T, prev: T) => boolean = is,
): () => T {
  const instance = createReactiveAtom();
  captureReactiveAtomForCleanup(instance);

  let value: T;

  const setup = captured(() => {
    effect(() => {
      const next = callback();
      if (!isEqual(value, next)) {
        value = next;
        notifyReactiveAtom(instance);
      }
    });
  });

  let doSetup = true;

  return () => {
    if (doSetup) {
      value = untrack(callback);
      setup();
      doSetup = false;
    }
    if (TRACKING) {
      trackReactiveAtom(instance);
    }
    return value;
  };
}
