import { onCleanup } from './cleanup-boundary';
import {
  createAtomNode,
  createComputedNode,
  createEffectNode,
  createResourceNode,
  destroyNode,
  readNode,
  readNodeResult,
  updateNode,
  writeNode,
} from './graph';
import { popObserver, pushObserver } from './owner';
import {
  type AtomNode,
  type Effect,
  type IsEqual,
  ResultState,
  ScheduleType,
} from './types';

export interface Atom<T> {
  (): T;
  (next: T): T;
}

export interface AtomOptions<T> {
  isEqual?: IsEqual<T>;
}

function atomAction<T>(this: AtomNode<T>, ...args: [] | [T]): T {
  if (args.length === 1) {
    writeNode(this, { type: ResultState.Success, value: args[0] });
    return readNodeResult(this);
  }
  return readNode(this);
}

export function atom<T>(value: T, options?: AtomOptions<T>): Atom<T> {
  const instance = createAtomNode(value, options?.isEqual);
  onCleanup((destroyNode<T>).bind(instance));
  return (atomAction<T>).bind(instance);
}

export interface ComputedOptions<T> {
  isEqual?: IsEqual<T>;
}

export function computed<T>(
  compute: () => T,
  options?: ComputedOptions<T>,
): () => T {
  const instance = createComputedNode(
    ScheduleType.Sync,
    compute,
    options?.isEqual,
  );
  onCleanup((destroyNode<T>).bind(instance));
  return (readNode<T>).bind(null, instance);
}

export function syncEffect(callback: Effect): () => void {
  const instance = createEffectNode(ScheduleType.Sync, callback);
  updateNode(instance);
  return onCleanup(destroyNode.bind(instance));
}

export function effect(callback: Effect): () => void {
  const instance = createEffectNode(ScheduleType.Idle, callback);
  updateNode(instance);
  return onCleanup(destroyNode.bind(instance));
}

export function deferred<T>(
  compute: () => T,
  options?: ComputedOptions<T>,
): () => T {
  const instance = createComputedNode(
    ScheduleType.Idle,
    compute,
    options?.isEqual,
  );
  onCleanup((destroyNode<T>).bind(instance));
  return (readNode<T>).bind(null, instance);
}

export function resource<T>(
  compute: () => T | Promise<T>,
  options?: ComputedOptions<T>,
): () => T {
  const instance = createResourceNode(
    ScheduleType.Sync,
    compute,
    options?.isEqual,
  );
  onCleanup((destroyNode<T>).bind(instance));
  return (readNode<T>).bind(null, instance);
}

export function untrack<T>(callback: () => T): T {
  const parent = pushObserver(undefined);
  try {
    return callback();
  } finally {
    popObserver(parent);
  }
}

export interface SignalOptions<T> {
  isEqual?: IsEqual<T>;
}

export type SignalSetStateAction<T> = (prev: T) => T;
export type SignalSetState<T> = (value: T | SignalSetStateAction<T>) => void;

export type Signal<T> = [() => T, SignalSetState<T>];

function isSignalSetStateAction<T>(
  value: unknown,
): value is SignalSetStateAction<T> {
  return typeof value === 'function';
}

function writeSignal<T>(
  this: AtomNode<T>,
  value: T | SignalSetStateAction<T>,
): void {
  if (this.value.type !== ResultState.Success) {
    return;
  }
  const newValue = isSignalSetStateAction<T>(value)
    ? value(this.value.value)
    : value;
  writeNode(this, { type: ResultState.Success, value: newValue });
}

export function signal<T>(value: T, options?: SignalOptions<T>): Signal<T> {
  const instance = createAtomNode(value, options?.isEqual);
  onCleanup((destroyNode<T>).bind(instance));
  return [(readNode<T>).bind(null, instance), (writeSignal<T>).bind(instance)];
}
