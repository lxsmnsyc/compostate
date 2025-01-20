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
}

export interface BaseReactiveNode<Observer extends boolean> {
  id: number;
  alive: boolean;
  state: Observer extends true ? State : Exclude<State, State.Check>;
}

export type IsEqual<T> = (prev: T, next: T) => boolean;

export interface Observable {
  computeds: Set<ComputedNode<any>> | undefined;

  effects: Set<EffectNode> | undefined;
}

export interface AtomNode<T> extends BaseReactiveNode<false>, Observable {
  type: NodeType.Atom;

  value: T;

  isEqual: IsEqual<T>;
}

export interface Observer {
  sources: Set<AtomNode<any> | ComputedNode<any>> | undefined;

  cleanup: Cleanup | undefined;
  errorBoundary: ErrorBoundary | undefined;
  contextTree: ContextTree | undefined;
}

export interface ComputedNode<T>
  extends BaseReactiveNode<true>,
    Observer,
    Observable {
  type: NodeType.Computed;

  value: T;

  compute: () => T;

  isEqual: IsEqual<T>;
}

export type ObservableNode = AtomNode<any> | ComputedNode<any>;
export type ObserverNode = ComputedNode<any> | EffectNode;

export const enum EffectType {
  Sync = 0,
  Idle = 1,
}

export interface EffectNode extends BaseReactiveNode<true>, Observer {
  type: NodeType.Effect;

  effectType: EffectType;

  callback: Effect;
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
