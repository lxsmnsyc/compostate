import { batchCleanup } from './cleanup-boundary';
import { IS_EQUAL } from './constants';
import { handleError } from './error-boundary';
import {
  getCurrentContextTree,
  getCurrentErrorBoundary,
  getCurrentObserver,
  getCurrentSuspenseBoundary,
  popContext,
  popErrorBoundary,
  popObserver,
  popSuspenseBoundary,
  pushContext,
  pushErrorBoundary,
  pushObserver,
  pushSuspenseBoundary,
} from './owner';
import { scheduleCallback } from './scheduler';
import {
  ResourceNotReadyError,
  SUSPENSE_MARKER,
  handleSuspense,
} from './suspense';
import type {
  AtomNode,
  ComputedNode,
  EffectNode,
  IsEqual,
  ObservableNode,
  ObserverNode,
  ReactiveNode,
  ResourceNode,
  ResultValue,
} from './types';
import { NodeType, ResultState, ScheduleType, State } from './types';

let ID = 0;

function getID(): number {
  return ID++;
}

export function createAtomNode<T>(
  value: T,
  isEqual: IsEqual<T> = IS_EQUAL,
): AtomNode<T> {
  return {
    id: getID(),
    state: State.Clean,
    alive: true,
    type: NodeType.Atom,
    version: 0,
    value: { type: ResultState.Success, value },
    isEqual,
    observers: undefined,
  };
}

export function createComputedNode<T>(
  scheduleType: ScheduleType,
  compute: () => T,
  isEqual: IsEqual<T> = IS_EQUAL,
): ComputedNode<T> {
  return {
    id: getID(),
    state: State.Uninitialized,
    alive: true,
    type: NodeType.Computed,
    isEqual,
    observers: undefined,
    version: 0,
    value: undefined,
    scheduleType,
    schedule: undefined,
    observables: undefined,
    cleanup: undefined,
    compute,
  };
}

export function createResourceNode<T>(
  scheduleType: ScheduleType,
  compute: () => T | Promise<T>,
  isEqual: IsEqual<T> = IS_EQUAL,
): ResourceNode<T> {
  return {
    id: getID(),
    state: State.Uninitialized,
    alive: true,
    type: NodeType.Resource,
    isEqual,
    observers: undefined,
    version: 0,
    value: undefined,
    scheduleType,
    schedule: undefined,
    observables: undefined,
    cleanup: undefined,
    compute,
  };
}

export function createEffectNode(
  scheduleType: ScheduleType,
  callback: () => void,
): EffectNode {
  return {
    id: getID(),
    state: State.Uninitialized,
    alive: true,
    type: NodeType.Effect,
    scheduleType,
    schedule: undefined,
    observables: undefined,
    cleanup: undefined,
    suspenseBoundary: getCurrentSuspenseBoundary(),
    errorBoundary: getCurrentErrorBoundary(),
    contextTree: getCurrentContextTree(),
    callback,
  };
}

function addObservable(
  node: ObserverNode<any>,
  source: ObservableNode<any>,
): void {
  if (!node.observables) {
    node.observables = new Set();
  }
  node.observables.add(source);
}

function addObserver(
  node: ObservableNode<any>,
  observer: ObserverNode<any>,
): void {
  if (!node.observers) {
    node.observers = new Set();
  }
  node.observers.add(observer);
}

function cleanObservers<T>(node: ObservableNode<T>): void {
  if (node.observers) {
    for (const observer of [...node.observers]) {
      if (observer.observables) {
        observer.observables.delete(node);
      }
    }
  }
}

function cleanObservables<T>(node: ObserverNode<T>): void {
  if (!node.observables) {
    return;
  }
  for (const source of node.observables) {
    if (source.observers) {
      source.observers.delete(node);
    }
  }

  node.observables.clear();
}

export function destroyNode<T>(this: ReactiveNode<T>): void {
  if (this.alive) {
    this.alive = false;

    if (
      this.type === NodeType.Computed ||
      this.type === NodeType.Effect ||
      this.type === NodeType.Resource
    ) {
      if (this.cleanup) {
        this.cleanup();
      }
      cleanObservables(this);
    }

    if (
      this.type === NodeType.Atom ||
      this.type === NodeType.Computed ||
      this.type === NodeType.Resource
    ) {
      cleanObservers(this);
    }
  }
}

function notifyObservers<T>(node: ObservableNode<T>, state: State): void {
  if (!(node.observers && node.alive)) {
    return;
  }
  const observers = [...node.observers];
  for (const observer of observers) {
    observer.state = state;
  }
  // 1st step
  for (const observer of observers) {
    if (observer.type !== NodeType.Effect) {
      notifyObservers(observer, State.Check);
    }
  }
  // 2nd step
  for (const observer of observers) {
    if (observer.type === NodeType.Effect) {
      updateNode(observer);
    }
  }
}

function canNodeUpdate<T>(node: ReactiveNode<T>): boolean {
  if (!node.alive) {
    return false;
  }
  switch (node.state) {
    case State.Clean:
      return false;
    case State.Check: {
      if (node.observables) {
        for (const source of [...node.observables]) {
          updateNode(source);
          if ((node as any).state === State.Dirty) {
            return true;
          }
        }
      }
      node.state = State.Clean;
      return false;
    }
    case State.Dirty:
    case State.Uninitialized:
      return true;
  }
}

export function writeNode<T>(
  node: ObservableNode<T>,
  value: ResultValue<T>,
): void {
  if (!node.alive) {
    return;
  }
  node.state = State.Clean;
  if (node.value) {
    // For pending results
    if (
      node.value.type === ResultState.Pending &&
      value.type === ResultState.Pending
    ) {
      return;
    }
    // For success results
    if (
      node.value.type === ResultState.Success &&
      value.type === ResultState.Success &&
      node.isEqual(node.value.value, value.value)
    ) {
      return;
    }
  }
  node.version++;
  node.value = value;
  notifyObservers(node, State.Dirty);
}

export function readNodeResult<T>(node: ObservableNode<T>): T {
  const result = node.value;
  if (!result) {
    throw new Error('unreachable');
  }
  if (result.type === ResultState.Success) {
    return result.value;
  }
  if (result.type === ResultState.Failure) {
    throw result.value;
  }
  throw getCurrentObserver() ? SUSPENSE_MARKER : new ResourceNotReadyError();
}

export function readNode<T>(node: ObservableNode<T>): T {
  updateNode(node);
  const observer = getCurrentObserver();
  if (observer) {
    addObservable(observer, node);
    addObserver(node, observer);
  }
  return readNodeResult(node);
}

function runComputedInternal<T>(this: ComputedNode<T>): void {
  cleanObservables(this);
  const parentObserver = pushObserver(this);
  try {
    writeNode(this, { type: ResultState.Success, value: this.compute() });
  } catch (error) {
    writeNode(this, { type: ResultState.Failure, value: error });
  } finally {
    popObserver(parentObserver);
  }
}
function runComputed<T>(node: ComputedNode<T>): void {
  if (!node.alive) {
    return;
  }
  node.state = State.Clean;
  if (node.cleanup) {
    node.cleanup();
  }
  node.cleanup = batchCleanup((runComputedInternal<T>).bind(node));
}

function runEffectInternal(this: EffectNode): void {
  cleanObservables(this);
  const parentObserver = pushObserver(this);
  const parentSuspenseBoundary = pushSuspenseBoundary(this.suspenseBoundary);
  const parentErrorBoundary = pushErrorBoundary(this.errorBoundary);
  const parentContext = pushContext(this.contextTree);
  try {
    this.callback();
  } catch (error) {
    if (error === SUSPENSE_MARKER) {
      try {
        handleSuspense(this.suspenseBoundary);
      } catch (newError) {
        handleError(this.errorBoundary, newError);
      }
    } else {
      handleError(this.errorBoundary, error);
    }
  } finally {
    popContext(parentContext);
    popErrorBoundary(parentErrorBoundary);
    popSuspenseBoundary(parentSuspenseBoundary);
    popObserver(parentObserver);
  }
}

function runEffect(node: EffectNode): void {
  if (!node.alive) {
    return;
  }
  node.state = State.Clean;
  if (node.cleanup) {
    node.cleanup();
  }
  node.cleanup = batchCleanup(runEffectInternal.bind(node));
}

function resolveResource<T>(
  this: ResourceNode<T>,
  version: number,
  value: T,
): void {
  if (this.version === version) {
    writeNode(this, { type: ResultState.Success, value });
  }
}

function rejectResource<T>(
  this: ResourceNode<T>,
  version: number,
  value: unknown,
): void {
  if (this.version === version) {
    writeNode(this, { type: ResultState.Failure, value });
  }
}

function runResourceInternal<T>(this: ResourceNode<T>): void {
  cleanObservables(this);
  const parentObserver = pushObserver(this);
  try {
    const result = Promise.resolve(this.compute());
    const version = this.version;
    writeNode(this, { type: ResultState.Pending, value: result });
    result.then(
      (resolveResource<T>).bind(this, version),
      (rejectResource<T>).bind(this, version),
    );
  } catch (error) {
    writeNode(this, { type: ResultState.Failure, value: error });
  } finally {
    popObserver(parentObserver);
  }
}
function runResource<T>(node: ResourceNode<T>): void {
  if (!node.alive) {
    return;
  }
  node.state = State.Clean;
  if (node.cleanup) {
    node.cleanup();
  }
  node.cleanup = batchCleanup((runResourceInternal<T>).bind(node));
}

function updateComputed<T>(node: ComputedNode<T>): void {
  if (
    node.scheduleType === ScheduleType.Sync ||
    node.state === State.Uninitialized
  ) {
    runComputed(node);
  } else {
    if (node.schedule) {
      node.schedule();
    }
    node.schedule = scheduleCallback((runComputed<T>).bind(null, node));
  }
}

function updateEffect(node: EffectNode): void {
  if (
    node.scheduleType === ScheduleType.Sync ||
    node.state === State.Uninitialized
  ) {
    runEffect(node);
  } else {
    if (node.schedule) {
      node.schedule();
    }
    node.schedule = scheduleCallback(runEffect.bind(null, node));
  }
}

function updateResource<T>(node: ResourceNode<T>): void {
  if (
    node.scheduleType === ScheduleType.Sync ||
    node.state === State.Uninitialized
  ) {
    runResource(node);
  } else {
    if (node.schedule) {
      node.schedule();
    }
    node.schedule = scheduleCallback((runResource<T>).bind(null, node));
  }
}

export function updateNode<T>(node: ReactiveNode<T>): void {
  if (!canNodeUpdate(node)) {
    return;
  }
  switch (node.type) {
    case NodeType.Atom:
      break;
    case NodeType.Computed:
      updateComputed(node);
      break;
    case NodeType.Effect:
      updateEffect(node);
      break;
    case NodeType.Resource:
      updateResource(node);
      break;
  }
}

// TODO add transition
