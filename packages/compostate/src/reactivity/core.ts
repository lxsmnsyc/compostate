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
  Publisher,
  publisherLinkSubscriber,
  setRunner,
  Subscriber,
  unlinkLinkedWorkPublishers,
} from '../linked-work';
import { cancelCallback, requestCallback, Task } from '../scheduler';
import { Failure, pcall, unwrap } from '../utils/pcall';
import {
  Cleanup,
  Effect,
  ErrorCapture,
  ReactiveBaseObject,
  Ref,
} from './types';

const { is, assign } = Object;

// Work types
const WORK_ATOM = 0b00000001;
const WORK_COMPUTATION = 0b00000010;
const WORK_EFFECT = 0b00000100;
const WORK_WATCH = 0b00001000;

// Execution contexts
export let TRACKING: LinkedWork | undefined;
let BATCH_UPDATES: Set<LinkedWork> | undefined;
let ERROR_BOUNDARY: ErrorBoundary | undefined;
let BATCH_EFFECTS: EffectWork[] | undefined;
let CONTEXT: ContextTree | undefined;
let CLEANUP: Cleanup[] | undefined;

export function unbatch<T>(callback: () => T): T {
  const parent = BATCH_UPDATES;
  BATCH_UPDATES = undefined;
  const result = pcall(callback, []);
  BATCH_UPDATES = parent;
  return unwrap(result);
}

export function unbatchCleanup<T>(callback: () => T): T {
  const parent = CLEANUP;
  CLEANUP = undefined;
  const result = pcall(callback, []);
  CLEANUP = parent;
  return unwrap(result);
}

export function unbatchEffects<T>(callback: () => T): T {
  const parent = BATCH_EFFECTS;
  BATCH_EFFECTS = undefined;
  const result = pcall(callback, []);
  BATCH_EFFECTS = parent;
  return unwrap(result);
}

export function untrack<T>(callback: () => T): T {
  const parent = TRACKING;
  TRACKING = undefined;
  const result = pcall(callback, []);
  TRACKING = parent;
  return unwrap(result);
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
  const result = pcall(callback, []);
  CLEANUP = parentCleanup;
  TRACKING = parentTracking;
  BATCH_EFFECTS = parentBatchEffects;
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
  CLEANUP?.push(cleanup);
  return cleanup;
}

function runBatchCleanupCallback(
  cleanups: Cleanup[],
  callback: () => void | undefined | Cleanup,
): void {
  const cleanup = callback();
  // Add the returned cleanup as well
  if (cleanup) {
    cleanups.push(cleanup);
  }
}

function exhaustCleanup(
  cleanups: Cleanup[],
  len: number,
): void {
  for (let i = 0; i < len; i++) {
    cleanups[i]();
  }
}

export function batchCleanup(callback: () => void | undefined | Cleanup): Cleanup {
  const cleanups: Cleanup[] = [];
  const parentCleanup = CLEANUP;
  CLEANUP = cleanups;
  const result = pcall(runBatchCleanupCallback, [cleanups, callback]);
  CLEANUP = parentCleanup;
  unwrap(result);
  let alive = true;
  // Create return cleanup
  return onCleanup(() => {
    if (alive) {
      alive = false;
      const len = cleanups.length;
      if (cleanups.length) {
        const parent = TRACKING;
        TRACKING = undefined;
        const internal = pcall(exhaustCleanup, [cleanups, len]);
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

function runErrorHandlers(calls: IterableIterator<ErrorCapture>, error: Error): void {
  for (const item of calls) {
    item(error);
  }
}

function handleError(instance: ErrorBoundary | undefined, error: Error): void {
  if (instance) {
    const { calls, parent } = instance;
    if (calls?.size) {
      const parentTracking = TRACKING;
      TRACKING = undefined;
      const result = pcall(runErrorHandlers, [calls.keys(), error]);
      TRACKING = parentTracking;
      if (result.status === Failure) {
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
  const result = pcall(callback, []);
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
  return createLinkedWork(Publisher, WORK_ATOM);
}

export function destroyReactiveAtom(target: ReactiveAtom): void {
  destroyLinkedWork(target);
}

export function trackReactiveAtom(target: ReactiveAtom): void {
  publisherLinkSubscriber(target, TRACKING!);
}

function exhaustUpdates(instance: Set<LinkedWork>): void {
  for (const work of instance) {
    if (work.alive) {
      if (work.type === Subscriber) {
        evaluateSubscriberWork(work);
      } else {
        evaluatePublisherWork(work);
      }
    }
  }
}

function runUpdates(instance: Set<LinkedWork>) {
  BATCH_UPDATES = instance;
  const result = pcall(exhaustUpdates, [instance]);
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
  const work: ComputationWork<T> = assign(createLinkedWork(Subscriber, WORK_COMPUTATION), {
    current: initial,
    process: callback,
    context: CONTEXT,
    errorBoundary: ERROR_BOUNDARY,
  });

  evaluateSubscriberWork(work);

  return onCleanup(() => {
    if (!work.alive) {
      return;
    }
    cleanProcess(work);
    work.process = undefined;
    destroyLinkedWork(work);
  });
}

interface EffectWork extends ProcessWork {
  callback?: Effect;
  cleanup?: Cleanup;
}

export function batchEffects(callback: () => void): () => void {
  const batchedEffects: EffectWork[] = [];
  const parent = BATCH_EFFECTS;
  BATCH_EFFECTS = batchedEffects;
  const result = pcall(callback, []);
  BATCH_EFFECTS = parent;
  unwrap(result);
  let alive = true;
  return () => {
    if (alive) {
      alive = false;
      for (let i = 0, len = batchedEffects.length; i < len; i++) {
        const item = batchedEffects[i];
        if (item.alive) {
          evaluateSubscriberWork(item);
        }
      }
      batchedEffects.length = 0;
    }
  };
}

export function effect(callback: Effect): Cleanup {
  const work: EffectWork = assign(createLinkedWork(Subscriber, WORK_EFFECT), {
    callback,
    context: CONTEXT,
    errorBoundary: ERROR_BOUNDARY,
  });

  if (BATCH_EFFECTS) {
    BATCH_EFFECTS.push(work);
  } else {
    evaluateSubscriberWork(work);
  }

  return onCleanup(() => {
    if (!work.alive) {
      return;
    }
    cleanProcess(work);
    work.callback = undefined;
    destroyLinkedWork(work);
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
  const work: WatchWork<T> = assign(createLinkedWork(Subscriber, WORK_WATCH), {
    source,
    listen,
    context: CONTEXT,
    errorBoundary: ERROR_BOUNDARY,
    isEqual,
  });

  evaluateSubscriberWork(work);

  return onCleanup(() => {
    if (!work.alive) {
      return;
    }
    cleanProcess(work);
    work.source = undefined;
    work.listen = undefined;
    work.current = undefined;
    work.isEqual = undefined;
    destroyLinkedWork(work);
  });
}

const REF = Symbol('COMPOSTATE_REF');
const READONLY = Symbol('COMPOSTATE_READONLY');
const TRACKABLE = Symbol('COMPOSTATE_TRACKABLE');

type WithRef = Record<typeof REF, boolean>;
type WithReadonly = Record<typeof READONLY, boolean>;
type WithTrackable = Record<typeof TRACKABLE, ReactiveAtom | undefined>;

export function registerTrackable<T>(
  instance: ReactiveAtom,
  trackable: T,
): T {
  (trackable as unknown as WithTrackable)[TRACKABLE] = instance;
  return trackable;
}

export function isTrackable<T>(
  trackable: T,
): boolean {
  return trackable && typeof trackable === 'object' && TRACKABLE in trackable;
}

export function getTrackableAtom<T>(
  trackable: T,
): ReactiveAtom | undefined {
  return (trackable as unknown as WithTrackable)[TRACKABLE];
}

export function isReadonly<T extends ReactiveBaseObject>(object: T): object is Readonly<T> {
  return object && typeof object === 'object' && READONLY in object;
}

const HANDLER = {
  set() {
    return true;
  },
};

export function readonly<T extends ReactiveBaseObject>(object: T): T {
  if (isReadonly(object)) {
    return object;
  }
  const newReadonly = new Proxy(object, HANDLER);
  (newReadonly as WithReadonly)[READONLY] = true;
  return newReadonly;
}

export function isRef<T>(object: any): object is Ref<T> {
  return object && typeof object === 'object' && REF in object;
}

export function computed<T>(
  compute: () => T,
  isEqual: (next: T, prev: T) => boolean = is,
): Readonly<Ref<T>> {
  const instance = createReactiveAtom();

  onCleanup(() => {
    destroyLinkedWork(instance);
  });

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

  const node: Ref<T> & WithRef & WithReadonly = {
    [REF]: true,
    [READONLY]: true,
    get value(): T {
      if (TRACKING) {
        trackReactiveAtom(instance);
      }
      return value;
    },
  };

  return node;
}

export function track<T>(source: T): T {
  if (TRACKING) {
    const instance = getTrackableAtom(source);
    if (instance) {
      trackReactiveAtom(instance);
    }
  }
  return source;
}

class RefNode<T> implements WithRef {
  private val: T;

  private instance: ReactiveAtom;

  private isEqual: (next: T, prev: T) => boolean;

  [REF]: boolean;

  constructor(
    value: T,
    instance: ReactiveAtom,
    isEqual: (next: T, prev: T) => boolean,
  ) {
    this.val = value;
    this.instance = instance;
    this.isEqual = isEqual;
    this[REF] = true;
  }

  get value() {
    if (TRACKING) {
      trackReactiveAtom(this.instance);
    }
    return this.val;
  }

  set value(next: T) {
    if (!this.isEqual(next, this.val)) {
      this.val = next;
      notifyReactiveAtom(this.instance);
    }
  }
}

export function ref<T>(
  value: T,
  isEqual: (next: T, prev: T) => boolean = is,
): Ref<T> {
  const instance = createReactiveAtom();
  onCleanup(() => {
    destroyLinkedWork(instance);
  });
  return new RefNode(value, instance, isEqual);
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
  onCleanup(() => {
    destroyLinkedWork(instance);
  });
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
  onCleanup(() => {
    destroyLinkedWork(instance);
  });
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

  onCleanup(() => {
    destroyLinkedWork(instance);
  });

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

interface ProcessWork extends LinkedWork {
  cleanup?: Cleanup;
  errorBoundary?: ErrorBoundary;
  context?: ContextTree;
}

function runComputationProcessInternal<T>(
  target: ComputationWork<T>,
  process: (prev?: T) => T,
) {
  target.cleanup?.();
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
    target.cleanup?.();
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

function runEffectProcessInternal(
  target: EffectWork,
  callback: Effect,
) {
  target.cleanup?.();
  target.cleanup = batchCleanup(callback);
}

function runEffectProcess(target: EffectWork) {
  const { callback } = target;
  if (callback) {
    batch(runEffectProcessInternal, target, callback);
  }
}

function runProcessInternal(target: ProcessWork) {
  switch (target.tag) {
    case WORK_COMPUTATION:
      runComputationProcess(target as ComputationWork<any>);
      break;
    case WORK_WATCH:
      runWatchProcess(target as WatchWork<any>);
      break;
    case WORK_EFFECT:
      runEffectProcess(target as EffectWork);
      break;
    default:
      break;
  }
}

function runProcess(target: ProcessWork) {
  unlinkLinkedWorkPublishers(target);
  const parentContext = CONTEXT;
  const parentTracking = TRACKING;
  const parentBatchEffects = BATCH_EFFECTS;
  const parentErrorBoundary = ERROR_BOUNDARY;
  ERROR_BOUNDARY = target.errorBoundary;
  BATCH_EFFECTS = undefined;
  TRACKING = target;
  CONTEXT = target.context;
  const result = pcall(runProcessInternal, [target]);
  CONTEXT = parentContext;
  TRACKING = parentTracking;
  BATCH_EFFECTS = parentBatchEffects;
  ERROR_BOUNDARY = parentErrorBoundary;
  if (result.status === Failure) {
    handleError(target.errorBoundary, result.value);
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
  const result = pcall(callback, []);
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

export function provide<T>(context: Context<T>, value: T): void {
  const parent = CONTEXT;
  if (parent) {
    parent.data[context.id] = { value };

    // If provide is called in a linked work,
    // make sure to delete the written data.
    onCleanup(() => {
      parent.data[context.id] = undefined;
    });
  }
}

export function inject<T>(context: Context<T>): T {
  let current = CONTEXT;
  while (current) {
    const currentData = current.data[context.id];
    if (currentData) {
      return currentData.value;
    }
    current = CONTEXT?.parent;
  }
  return context.defaultValue;
}

export function selector<T, U extends T>(
  source: () => T,
  fn: (a: U, b: T) => boolean = is,
): (item: U) => boolean {
  const subs = new Map<U, Set<LinkedWork>>();
  let v: T;
  watch(source, (current, prev) => {
    for (const key of subs.keys()) {
      if (fn(key, current) || (prev !== undefined && fn(key, prev))) {
        const listeners = subs.get(key);
        if (listeners?.size) {
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
      onCleanup(() => {
        if (listeners.size > 1) {
          listeners.delete(current);
        } else {
          subs.delete(key);
        }
      });
    }
    return fn(key, v);
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
  const result = pcall(callback, []);
  BATCH_UPDATES = parent;
  unwrap(result);

  scheduleTransition();
}

export function isTransitionPending(): boolean {
  return readTransitionPending();
}

export function deferredAtom<T>(callback: () => T): () => T {
  const [read, write] = signal(untrack(callback));
  effect(() => {
    startTransition(() => {
      write(callback());
    });
  });
  return read;
}

export function deferred<T>(callback: () => T): Readonly<Ref<T>> {
  return computed(deferredAtom(callback));
}
