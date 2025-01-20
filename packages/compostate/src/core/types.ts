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
  Atom = 0,
  Computed = 1,
  Effect = 2,
  Resource = 3,
}

export interface BaseReactiveNode<Observer extends boolean> {
  id: number;
  alive: boolean;
  state: Observer extends true ? State : Exclude<State, State.Check>;
}

export type IsEqual<T> = (prev: T, next: T) => boolean;

export interface Observable {
  version: number;
  observers: Set<ObserverNode<any>> | undefined;
}

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

export interface AtomNode<T> extends BaseReactiveNode<false>, Observable {
  type: NodeType.Atom;

  value: ResultValue<T>;

  isEqual: IsEqual<T>;
}

export const enum ScheduleType {
  Sync = 0,
  Idle = 1,
}

export interface Observer {
  scheduleType: ScheduleType;
  schedule: Cleanup | undefined;

  observables: Set<ObservableNode<any>> | undefined;

  cleanup: Cleanup | undefined;
}

export interface ComputedNode<T>
  extends BaseReactiveNode<true>,
    Observer,
    Observable {
  type: NodeType.Computed;

  value: ResultValue<T> | undefined;

  compute: () => T;

  isEqual: IsEqual<T>;
}

export interface EffectNode extends BaseReactiveNode<true>, Observer {
  type: NodeType.Effect;

  callback: Effect;

  errorBoundary: ErrorBoundary | undefined;
  suspenseBoundary: SuspenseBoundary | undefined;
  contextTree: ContextTree | undefined;
}

export interface ResourceNode<T>
  extends BaseReactiveNode<true>,
    Observer,
    Observable {
  type: NodeType.Resource;

  value: ResultValue<T> | undefined;

  compute: () => T | Promise<T>;

  isEqual: IsEqual<T>;
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

export type ObservableNode<T> = AtomNode<T> | ComputedNode<T> | ResourceNode<T>;

export type ObserverNode<T> = ComputedNode<T> | ResourceNode<T> | EffectNode;

export type ReactiveNode<T> = ObservableNode<T> | ObserverNode<T>;

export type SuspenseHandler = () => void;

export interface SuspenseBoundary {
  handlers: Set<SuspenseHandler> | undefined;
}
