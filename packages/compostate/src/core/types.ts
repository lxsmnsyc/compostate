import type { EffectNode } from './graph';

export type Effect = () => void;

export const enum State {
  /**
   * The observable/processor is clean, no revalidations needed and values can
   * be safely reused
   */
  Clean = 0,
  /**
   * The observable/processor may or may not be dirty, check first.
   */
  Check = 1,
  /**
   * The observable/processor is dirty, revalidate immediately.
   */
  Dirty = 2,
  /**
   * The processor/observer is uninitialized, revalidate regardless.
   */
  Uninitialized = 3,
}

export const enum NodeType {
  /**
   * Basic read/write unit of reactivity
   */
  Atom = 0,
  /**
   * Derived reactivity
   */
  Computed = 1,
  /**
   * Reactive subscription
   */
  Effect = 2,
  /**
   * Async derived reactivity
   */
  Resource = 3,
  /**
   * Basic notifier
   */
  Pulse = 4,
}

export type IsEqual<T> = (prev: T, next: T) => boolean;

export const enum ResultState {
  Pending = 0,
  Success = 1,
  Failure = 2,
}

export interface PendingResult<T> {
  type: ResultState.Pending;
  value: Promise<T>;
}

export interface SuccessResult<T> {
  type: ResultState.Success;
  value: T;
}

export interface FailureResult {
  type: ResultState.Failure;
  value: unknown;
}

export type ResultValue<T> =
  | PendingResult<T>
  | SuccessResult<T>
  | FailureResult;

export const enum ScheduleType {
  Sync = 0,
  Idle = 1,
}

export interface Ref<T> {
  value: T;
}

export interface ContextTree {
  parent?: ContextTree;
  data: Record<string, Ref<any> | undefined>;
}

export interface Context<T> {
  id: number;
  defaultValue: T;
}

export type Cleanup = () => void;

export interface CleanupBoundary {
  alive: boolean;
  cleanups: Set<Cleanup> | undefined;
}

export type ErrorHandler = (error: unknown) => void;

export interface ErrorBoundary {
  parent: ErrorBoundary | undefined;
  handlers: Set<ErrorHandler> | undefined;
}

export type SuspenseHandler = () => void;

export interface SuspenseBoundary {
  handlers: Set<SuspenseHandler> | undefined;
}

export interface BatchedUpdates {
  effects: Set<EffectNode> | undefined;
}

export type Computation<T> = (prev: Ref<T> | undefined) => T;

export type ResourceComputation<T> = (
  prev: Ref<T> | undefined,
) => T | Promise<T>;
