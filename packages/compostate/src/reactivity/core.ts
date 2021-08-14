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

let HAS_PROCESS = true;

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
  return createLinkedWork(WORK_ATOM);
}

export function destroyReactiveAtom(target: ReactiveAtom): void {
  destroyLinkedWork(target);
}

export function trackReactiveAtom(target: ReactiveAtom): void {
  linkLinkedWork(target, TRACKING!);
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
  cleanup?: Cleanup;
  process?: (prev?: T) => T;
  current?: T;
}

export function computation<T>(callback: (prev?: T) => T, initial?: T): Cleanup {
  if (!HAS_PROCESS) {
    callback(initial);
    return NO_OP;
  }

  const work: ComputationWork<T> = assign(createLinkedWork(WORK_COMPUTATION), {
    current: initial,
    process: callback,
    errorBoundary: ERROR_BOUNDARY,
  });

  runLinkedWork(work);

  return onCleanup(() => {
    if (work.cleanup) {
      batch(work.cleanup);
    }
    work.cleanup = undefined;
    work.process = undefined;
    work.errorBoundary = undefined;
    destroyLinkedWork(work);
  });
}

interface EffectWork extends ProcessWork {
  callback?: Effect;
  cleanup?: Cleanup;
}

function createEffect(callback: Effect): EffectWork {
  const node = assign(createLinkedWork(WORK_EFFECT), {
    callback,
    errorBoundary: ERROR_BOUNDARY,
  });
  return node;
}

export function batchEffects(callback: () => void): () => void {
  if (!HAS_PROCESS) {
    callback();
    return NO_OP;
  }
  const batchedEffects: EffectWork[] = [];
  const parent = BATCH_EFFECTS;
  BATCH_EFFECTS = batchedEffects;
  try {
    callback();
  } finally {
    BATCH_EFFECTS = parent;
  }
  let alive = true;
  return () => {
    if (alive) {
      alive = false;
      for (let i = 0, len = batchedEffects.length; i < len; i++) {
        runLinkedWork(batchedEffects[i]);
      }
      batchedEffects.length = 0;
    }
  };
}

export function effect(callback: Effect): Cleanup {
  if (!HAS_PROCESS) {
    return NO_OP;
  }

  const instance = createEffect(callback);

  if (BATCH_EFFECTS) {
    BATCH_EFFECTS.push(instance);
  } else {
    runLinkedWork(instance);
  }

  return onCleanup(() => {
    if (instance.cleanup) {
      batch(instance.cleanup);
    }
    instance.callback = undefined;
    instance.cleanup = undefined;
    instance.errorBoundary = undefined;
    destroyLinkedWork(instance);
  });
}

interface WatchWork<T> extends ProcessWork {
  source?: () => T,
  listen?: (next: T, prev?: T) => void,
  current?: T;
  shouldUpdate?: (next: T, prev: T) => boolean,
}

export function watch<T>(
  source: () => T,
  listen: (next: T, prev?: T) => void,
  shouldUpdate: (next: T, prev: T) => boolean = is,
): () => void {
  if (!HAS_PROCESS) {
    listen(source());
    return NO_OP;
  }

  const work: WatchWork<T> = assign(createLinkedWork(WORK_WATCH), {
    source,
    listen,
    errorBoundary: ERROR_BOUNDARY,
    shouldUpdate,
  });

  runLinkedWork(work);

  return onCleanup(() => {
    work.source = undefined;
    work.listen = undefined;
    work.current = undefined;
    work.errorBoundary = undefined;
    work.shouldUpdate = undefined;
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
  shouldUpdate: (next: T, prev: T) => boolean = is,
): Ref<T> {
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
  }, shouldUpdate);

  const node: Ref<T> & WithRef = {
    [REF]: true,
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

  private shouldUpdate: (next: T, prev: T) => boolean;

  [REF]: true;

  constructor(value: T, instance: ReactiveAtom, shouldUpdate: (next: T, prev: T) => boolean) {
    this.val = value;
    this.instance = instance;
    this.shouldUpdate = shouldUpdate;
  }

  get value() {
    if (TRACKING) {
      trackReactiveAtom(this.instance);
    }
    return this.val;
  }

  set value(next: T) {
    if (!this.shouldUpdate(next, this.val)) {
      this.val = next;
      notifyReactiveAtom(this.instance);
    }
  }
}

export function ref<T>(
  value: T,
  shouldUpdate: (next: T, prev: T) => boolean = is,
): Ref<T> {
  const instance = createReactiveAtom();
  onCleanup(() => {
    destroyLinkedWork(instance);
  });
  return new RefNode(value, instance, shouldUpdate);
}

export interface Atom<T> {
  (): T;
  (next: T): T;
}

export function atom<T>(value: T, shouldUpdate: (next: T, prev: T) => boolean = is): Atom<T> {
  const instance = createReactiveAtom();
  onCleanup(() => {
    destroyLinkedWork(instance);
  });
  return (...args: [] | [T]) => {
    if (args.length === 1) {
      const next = args[0];
      if (!shouldUpdate(next, value)) {
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
  shouldUpdate: (next: T, prev: T) => boolean = is,
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
  }, shouldUpdate);

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
}

function runComputationProcess(target: ComputationWork<any>) {
  const { process } = target;
  if (process) {
    batch(() => {
      target.cleanup?.();
      target.cleanup = batchCleanup(() => {
        target.current = process(target.current);
      });
    });
  }
}

function runWatchProcess(target: WatchWork<any>) {
  const { source, listen } = target;
  if (source && listen) {
    batch(() => {
      const hasCurrent = 'current' in target;
      const next = source();
      const prev = target.current;
      const compare = target.shouldUpdate ?? is;
      if ((hasCurrent && !compare(next, prev)) || !hasCurrent) {
        target.cleanup?.();
        target.cleanup = batchCleanup(() => {
          target.current = next;
          listen(next, prev);
        });
      }
    });
  }
}

function runEffectProcess(target: EffectWork) {
  const { callback } = target;
  if (callback) {
    batch(() => {
      target.cleanup?.();
      target.cleanup = batchCleanup(callback);
    });
  }
}

function runProcess(target: ProcessWork) {
  if (target.tag === WORK_ATOM) {
    return;
  }
  unlinkLinkedWorkPublishers(target);
  const parentTracking = TRACKING;
  const parentBatchEffects = BATCH_EFFECTS;
  const parentErrorBoundary = ERROR_BOUNDARY;
  ERROR_BOUNDARY = target.errorBoundary;
  BATCH_EFFECTS = undefined;
  TRACKING = target;
  try {
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
  } catch (error) {
    handleError(target.errorBoundary, error);
  } finally {
    TRACKING = parentTracking;
    BATCH_EFFECTS = parentBatchEffects;
    ERROR_BOUNDARY = parentErrorBoundary;
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
  if (!HAS_PROCESS) {
    const result = source();
    return (key: U) => fn(key, result);
  }

  const subs = new Map<U, Set<LinkedWork>>();
  let v: T;
  watch(source, (current, prev) => {
    const keys = Array.from(subs.keys());

    for (let i = 0, len = keys.length; i < len; i++) {
      const key = keys[i];
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

export function disableProcess<T>(callback: () => T): T {
  const parent = HAS_PROCESS;
  HAS_PROCESS = false;
  try {
    return callback();
  } finally {
    HAS_PROCESS = parent;
  }
}

export function enableProcess<T>(callback: () => T): T {
  const parent = HAS_PROCESS;
  HAS_PROCESS = true;
  try {
    return callback();
  } finally {
    HAS_PROCESS = parent;
  }
}
