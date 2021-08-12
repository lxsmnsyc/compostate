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
let CONTEXT: ContextTree | undefined;

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

export function capturedProvider<T extends any[], R>(
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
    transitions.clear();
    isPending = false;
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

interface ComputationWork<T> extends ProcessWork {
  process?: (prev?: T) => T;
  current?: T;
}

export function computation<T>(callback: (prev?: T) => T): Cleanup {
  const work: ComputationWork<T> = assign(createLinkedWork('computation'), {
    process: callback,
    errorBoundary: ERROR_BOUNDARY,
  });

  runLinkedWork(work);

  return onCleanup(() => {
    work.process = undefined;
    work.errorBoundary = undefined;
    destroyLinkedWork(work);
  });
}

interface EffectWork extends ProcessWork {
  callback?: Effect;
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
    batch(() => {
      cleanupEffect(node);
    });
    node.callback = undefined;
    node.cleanup = undefined;
    node.errorBoundary = undefined;
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

interface WatchWork<T> extends ProcessWork {
  source?: () => T,
  listen?: (next: T, prev?: T) => void,
  current?: T;
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
    work.source = undefined;
    work.listen = undefined;
    work.current = undefined;
    work.errorBoundary = undefined;
    destroyLinkedWork(work);
  });
}

export function computed<T>(compute: () => T): Ref<T> {
  const atom = createReactiveAtom();

  let value: T;

  watch(compute, (current) => {
    value = current;
    notifyReactiveAtom(atom);
  });

  return registerTrackable(atom, {
    get value(): T {
      trackReactiveAtom(atom);
      return value;
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
  const { process } = target;
  if (process) {
    batch(() => {
      target.current = process(target.current);
    });
  }
}

function runWatchProcess(target: WatchWork<any>) {
  const { source, listen } = target;
  if (source && listen) {
    const hasCurrent = 'current' in target;
    const next = source();
    const prev = target.current;
    if ((hasCurrent && !is(next, prev)) || !hasCurrent) {
      target.current = next;
      batch(() => {
        listen(next, prev);
      });
    }
  }
}

function runEffectProcess(target: EffectWork) {
  const parentBatchEffects = BATCH_EFFECTS;
  const parentErrorBoundary = ERROR_BOUNDARY;
  BATCH_EFFECTS = undefined;
  ERROR_BOUNDARY = target.errorBoundary;
  try {
    const { callback } = target;
    if (callback) {
      batch(() => {
        cleanupEffect(target);
        target.cleanup = batchCleanup(callback);
      });
    }
  } finally {
    BATCH_EFFECTS = parentBatchEffects;
    ERROR_BOUNDARY = parentErrorBoundary;
  }
}

function runProcess(target: ProcessWork) {
  unlinkLinkedWorkPublishers(target);
  const parentTracking = TRACKING;
  TRACKING = target;
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
      case 'atom':
      default:
        break;
    }
  } catch (error) {
    handleError(target.errorBoundary, error);
  } finally {
    TRACKING = parentTracking;
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
        if (listeners) {
          for (const listener of listeners) {
            notifyReactiveAtom(listener);
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
