import { onCleanup } from './cleanup-boundary';
import {
  AtomNode,
  ComputedNode,
  EffectNode,
  ResourceNode,
  destroyAtomNode,
  destroyComputedNode,
  destroyEffectNode,
  destroyResourceNode,
  readAtomNode,
  readNode,
  revalidateNode,
  writeAtomNode,
} from './graph';
import { popTracker, pushTracker } from './owner';
import { ResourceNotReadyError } from './suspense';
import { type Effect, type IsEqual, ResultState, ScheduleType } from './types';

export interface Atom<T> {
  (): T;
  (next: T): T;
}

export interface AtomOptions<T> {
  isEqual?: IsEqual<T>;
}

function atomAction<T>(this: AtomNode<T>, ...args: [] | [T]): T {
  if (args.length === 1) {
    writeAtomNode(this, args[0]);
    return this.value;
  }
  return readAtomNode(this);
}

export function atom<T>(value: T, options?: AtomOptions<T>): Atom<T> {
  const instance = new AtomNode(value, options?.isEqual);
  onCleanup((destroyAtomNode<T>).bind(instance));
  return (atomAction<T>).bind(instance);
}

export interface ComputedOptions<T> {
  isEqual?: IsEqual<T>;
}

export function computed<T>(
  compute: () => T,
  options?: ComputedOptions<T>,
): () => T {
  const instance = new ComputedNode(
    ScheduleType.Sync,
    compute,
    options?.isEqual,
  );
  onCleanup((destroyComputedNode<T>).bind(instance));
  return (readNode<T>).bind(null, instance);
}

export function syncEffect(callback: Effect): () => void {
  const instance = new EffectNode(ScheduleType.Sync, callback);
  revalidateNode(instance);
  return onCleanup(destroyEffectNode.bind(instance));
}

export function effect(callback: Effect): () => void {
  const instance = new EffectNode(ScheduleType.Idle, callback);
  revalidateNode(instance);
  return onCleanup(destroyEffectNode.bind(instance));
}

export function deferred<T>(
  compute: () => T,
  options?: ComputedOptions<T>,
): () => T {
  const instance = new ComputedNode(
    ScheduleType.Idle,
    compute,
    options?.isEqual,
  );
  onCleanup((destroyComputedNode<T>).bind(instance));
  return (readNode<T>).bind(null, instance);
}

export function resource<T>(
  compute: () => T | Promise<T>,
  options?: ComputedOptions<T>,
): () => T {
  const instance = new ResourceNode(
    ScheduleType.Sync,
    compute,
    options?.isEqual,
  );
  onCleanup((destroyResourceNode<T>).bind(instance));
  return (readNode<T>).bind(null, instance);
}

export function untrack<T>(callback: () => T): T {
  const parent = pushTracker(undefined);
  try {
    return callback();
  } finally {
    popTracker(parent);
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
  writeAtomNode(
    this,
    isSignalSetStateAction<T>(value) ? value(this.value) : value,
  );
}

export function signal<T>(value: T, options?: SignalOptions<T>): Signal<T> {
  const instance = new AtomNode(value, options?.isEqual);
  onCleanup((destroyAtomNode<T>).bind(instance));
  return [
    (readAtomNode<T>).bind(null, instance),
    (writeSignal<T>).bind(instance),
  ];
}

export type UnwrapSignal<T> = T extends () => infer R ? R : never;

export type UnwrapSignals<T> = T extends [infer F, ...infer Rest]
  ? [UnwrapSignal<F>, ...UnwrapSignals<Rest>]
  : T extends [infer F]
    ? [UnwrapSignal<F>]
    : [];

type Result<T> =
  | { type: 0 }
  | { type: 1; value: T }
  | { type: 2; value: unknown };

function toResult<T>(signal: () => T): Result<T> {
  try {
    return { type: ResultState.Success, value: signal() };
  } catch (error) {
    if (error instanceof ResourceNotReadyError) {
      return { type: ResultState.Pending };
    }
    return { type: ResultState.Failure, value: error };
  }
}

export function waitForAll<T extends (() => any)[]>(
  signals: T,
): UnwrapSignals<T> {
  const results: Result<unknown>[] = [];
  for (let i = 0, len = signals.length; i < len; i++) {
    results.push(toResult(signals[i]));
  }
  const values: unknown[] = [];
  const errors: unknown[] = [];
  for (let i = 0, len = results.length; i < len; i++) {
    const result = results[i];
    if (result.type === ResultState.Pending) {
      throw new ResourceNotReadyError();
    }
    if (result.type === ResultState.Success) {
      values.push(result.value);
    }
    if (result.type === ResultState.Failure) {
      errors.push(result.value);
    }
  }

  if (errors.length > 0) {
    // TODO shim
    throw new AggregateError(errors);
  }
  return values as UnwrapSignals<T>;
}
