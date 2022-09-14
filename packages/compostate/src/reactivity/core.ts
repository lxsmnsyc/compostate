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
  pcall,
  pcall0,
  pcall1,
  pcall2,
  unwrap,
} from '../utils/pcall';
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
const WORK_WATCH = 0b00001000;
const WORK_SYNC_EFFECT = 0b00010000;

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
  const result = pcall0(callback);
  BATCH_UPDATES = parent;
  return unwrap(result);
}

export function unbatchCleanup<T>(callback: () => T): T {
  const parent = CLEANUP;
  CLEANUP = undefined;
  const result = pcall0(callback);
  CLEANUP = parent;
  return unwrap(result);
}

export function untrack<T>(callback: () => T): T {
  const parent = TRACKING;
  TRACKING = undefined;
  const result = pcall0(callback);
  TRACKING = parent;
  return unwrap(result);
}

export function createRoot<T>(callback: () => T): T {
  const parentBatchUpdates = BATCH_UPDATES;
  const parentTracking = TRACKING;
  const parentCleanup = CLEANUP;
  BATCH_UPDATES = undefined;
  TRACKING = undefined;
  CLEANUP = undefined;
  const result = pcall0(callback);
  CLEANUP = parentCleanup;
  TRACKING = parentTracking;
  BATCH_UPDATES = parentBatchUpdates;
  return unwrap(result);
}

export function capturedBatchCleanup<T extends any[], R>(
  callback: (...args: T) => R,
): (...args: T) => R {
  const current = CLEANUP;
  return (...args) => {
    const parent = CLEANUP;
    CLEANUP = current;
    const result = pcall(callback, args);
    CLEANUP = parent;
    return unwrap(result);
  };
}

export function capturedErrorBoundary<T extends any[], R>(
  callback: (...args: T) => R,
): (...args: T) => R {
  const current = ERROR_BOUNDARY;
  return (...args) => {
    const parent = ERROR_BOUNDARY;
    ERROR_BOUNDARY = current;
    const result = pcall(callback, args);
    ERROR_BOUNDARY = parent;
    return unwrap(result);
  };
}

export function capturedContext<T extends any[], R>(
  callback: (...args: T) => R,
): (...args: T) => R {
  const current = CONTEXT;
  return (...args) => {
    const parent = CONTEXT;
    CONTEXT = current;
    const result = pcall(callback, args);
    CONTEXT = parent;
    return unwrap(result);
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
    const result = pcall(callback, args);
    CONTEXT = parentContext;
    CLEANUP = parentCleanup;
    ERROR_BOUNDARY = parentErrorBoundary;
    return unwrap(result);
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
  const result = pcall0(callback);
  CLEANUP = parentCleanup;
  unwrap(result);
  let alive = true;
  // Create return cleanup
  return onCleanup(() => {
    if (alive) {
      alive = false;
      if (cleanups.size) {
        const parent = TRACKING;
        TRACKING = undefined;
        const internal = pcall1(exhaustCleanup, cleanups);
        TRACKING = parent;
        unwrap(internal);
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
    if (calls && calls.size) {
      const parentTracking = TRACKING;
      TRACKING = undefined;
      const result = pcall2(runErrorHandlers, calls.keys(), error);
      TRACKING = parentTracking;
      if (!result.isSuccess) {
        handleError(parent, error);
        handleError(parent, result.value);
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
  const result = pcall0(callback);
  ERROR_BOUNDARY = parentInstance;
  return unwrap(result);
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
  const result = pcall1(exhaustUpdates, instance);
  BATCH_UPDATES = undefined;
  unwrap(result);
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
    const result = pcall(callback, args);
    BATCH_UPDATES = undefined;
    unwrap(result);
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

interface WatchWork<T> extends ProcessWork {
  source?: () => T,
  listen?: (next: T, prev?: T) => void,
  current?: T;
  isEqual?: (next: T, prev: T) => boolean,
}

export function watch<T>(
  source: () => T,
  listen: (next: T, prev?: T) => void,
  isEqual: (next: T, prev: T) => boolean = is,
): () => void {
  const work: WatchWork<T> = assign(createLinkedWork(true, WORK_WATCH), {
    source,
    listen,
    context: CONTEXT,
    errorBoundary: ERROR_BOUNDARY,
    isEqual,
  });

  evaluateSubscriberWork(work);

  return onCleanup(() => {
    if (work.alive) {
      cleanProcess(work);
      work.source = undefined;
      work.listen = undefined;
      work.current = undefined;
      work.isEqual = undefined;
      destroyLinkedWork(work);
    }
  });
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

export function computedAtom<T>(
  compute: () => T,
  isEqual: (next: T, prev: T) => boolean = is,
): () => T {
  const instance = createReactiveAtom();
  captureReactiveAtomForCleanup(instance);

  let value: T;
  let initial = true;

  watch(compute, (current) => {
    value = current;
    if (initial) {
      initial = false;
    } else {
      notifyReactiveAtom(instance);
    }
  }, isEqual);

  return () => {
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
  const result = pcall1(work, target);
  CONTEXT = parentContext;
  TRACKING = parentTracking;
  ERROR_BOUNDARY = parentErrorBoundary;
  if (!result.isSuccess) {
    handleError(target.errorBoundary, result.value);
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

function runWatchProcessInternal<T>(
  target: WatchWork<T>,
  source: () => T,
  listen: (next: T, prev?: T) => void,
) {
  const hasCurrent = 'current' in target;
  const next = source();
  const prev = target.current;
  const compare = target.isEqual ?? is;
  if ((hasCurrent && !compare(next, prev)) || !hasCurrent) {
    if (target.cleanup) {
      target.cleanup();
    }
    target.cleanup = batchCleanup(() => {
      target.current = next;
      listen(next, prev);
    });
  }
}

function runWatchProcess(target: WatchWork<any>) {
  const { source, listen } = target;
  if (source && listen) {
    batch(runWatchProcessInternal, target, source, listen);
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
    case WORK_WATCH:
      processWork(target, runWatchProcess);
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
  const result = pcall0(callback);
  CONTEXT = parent;
  return unwrap(result);
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
  });
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
  const result = pcall0(callback);
  BATCH_UPDATES = parent;
  unwrap(result);

  scheduleTransition();
}

export function isTransitionPending(): boolean {
  return readTransitionPending();
}

export function deferredAtom<T>(
  callback: () => T,
  isEqual: (next: T, prev: T) => boolean = is,
): () => T {
  const instance = createReactiveAtom();
  captureReactiveAtomForCleanup(instance);

  let value = untrack(callback);

  syncEffect(() => {
    startTransition(() => {
      const next = callback();
      if (!isEqual(value, next)) {
        value = next;
        notifyReactiveAtom(instance);
      }
    });
  });

  return () => {
    if (TRACKING) {
      trackReactiveAtom(instance);
    }
    return value;
  };
}
