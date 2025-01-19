export interface Ref<T> {
  value: T;
}

function NO_OP(): void {
  // no-op
}

let CONTEXT_TREE: ContextTree | undefined;

interface ContextTree {
  parent?: ContextTree;
  data: Record<string, Ref<any> | undefined>;
}

export function contextual<T>(callback: () => T): T {
  const parent = CONTEXT_TREE;
  CONTEXT_TREE = {
    parent,
    data: {},
  };
  try {
    return callback();
  } finally {
    CONTEXT_TREE = parent;
  }
}

export interface Context<T> {
  id: number;
  defaultValue: T;
}

let CONTEXT_ID = 0;

function clearContextData(this: ContextTree, id: number) {
  // If provide is called in a linked work,
  // make sure to delete the written data.
  this.data[id] = undefined;
}

export function createContext<T>(defaultValue: T): Context<T> {
  return {
    id: CONTEXT_ID++,
    defaultValue,
  };
}

export function writeContext<T>(context: Context<T>, value: T): void {
  const parent = CONTEXT_TREE;
  if (parent) {
    parent.data[context.id] = { value };
    if (CLEANUP) {
      onCleanup(clearContextData.bind(parent, context.id));
    }
  }
}

export function readContext<T>(context: Context<T>): T {
  let current = CONTEXT_TREE;
  while (current) {
    const currentData = current.data[context.id];
    if (currentData) {
      return currentData.value;
    }
    if (CONTEXT_TREE) {
      current = CONTEXT_TREE.parent;
    } else {
      break;
    }
  }
  return context.defaultValue;
}

export type Cleanup = () => void;

interface CleanupBoundary {
  alive: boolean;
  cleanups: Set<Cleanup> | undefined;
}

let CLEANUP: CleanupBoundary | undefined;

function addCleanup(instance: CleanupBoundary, cleanup: Cleanup): void {
  // so it's easier to change
  if (!instance.cleanups) {
    instance.cleanups = new Set();
  }
  instance.cleanups.add(cleanup);
}

function runCleanup(this: CleanupBoundary): void {
  // TODO untrack
  if (this.alive) {
    this.alive = false;

    if (this.cleanups && this.cleanups.size) {
      const parent = TRACKING;
      TRACKING = undefined;
      try {
        for (const cleanup of this.cleanups) {
          cleanup();
        }
      } finally {
        TRACKING = parent;
      }
    }
  }
}

export function onCleanup(callback: Cleanup): Cleanup {
  if (CLEANUP) {
    addCleanup(CLEANUP, callback);
  }
  return callback;
}

export function batchCleanup(callback: Cleanup): Cleanup {
  const boundary: CleanupBoundary = {
    alive: true,
    cleanups: undefined,
  };
  const parent = CLEANUP;
  CLEANUP = boundary;
  try {
    callback();
  } finally {
    CLEANUP = parent;
  }

  return onCleanup(runCleanup.bind(boundary));
}

export type ErrorHandler = (error: unknown) => void;

interface ErrorBoundary {
  parent: ErrorBoundary | undefined;
  handlers: Set<ErrorHandler> | undefined;
}

let ERROR_BOUNDARY: ErrorBoundary | undefined;

function handleError(
  instance: ErrorBoundary | undefined,
  error: unknown,
): void {
  if (instance) {
    // Check if the current boundary has listeners
    if (instance.handlers && instance.handlers.size) {
      // Untrack before passing error
      const parentTracking = TRACKING;
      TRACKING = undefined;
      try {
        for (const handler of instance.handlers) {
          handler(error);
        }
      } catch (value) {
        // If the error handler fails, forward the new error and the current error
        handleError(instance.parent, value);
        handleError(instance.parent, error);
      } finally {
        TRACKING = parentTracking;
      }
    } else {
      // Forward the error to the parent
      handleError(instance.parent, error);
    }
  } else {
    throw error;
  }
}

function addErrorHandler(instance: ErrorBoundary, handler: ErrorHandler): void {
  if (!instance.handlers) {
    instance.handlers = new Set();
  }
  instance.handlers.add(handler);
}

function removeErrorHandler(this: ErrorBoundary, handler: ErrorHandler): void {
  if (this.handlers) {
    this.handlers.delete(handler);
  }
}

export function onError(handler: ErrorHandler): Cleanup {
  if (ERROR_BOUNDARY) {
    addErrorHandler(ERROR_BOUNDARY, handler);
    return onCleanup(removeErrorHandler.bind(ERROR_BOUNDARY, handler));
  }
  return NO_OP;
}

export function errorBoundary<T>(callback: () => T): T {
  const parent = ERROR_BOUNDARY;
  ERROR_BOUNDARY = {
    parent,
    handlers: undefined,
  };
  try {
    return callback();
  } finally {
    ERROR_BOUNDARY = parent;
  }
}

const enum State {
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

const enum NodeType {
  Atom = 0,
  Computed = 1,
  Effect = 2,
}

interface BaseReactiveNode<Observer extends boolean> {
  id: number;
  alive: boolean;
  state: Observer extends true ? State : Exclude<State, State.Check>;
}

type IsEqual<T> = (prev: T, next: T) => boolean;

interface AtomNode<T> extends BaseReactiveNode<false> {
  type: NodeType.Atom;

  value: T;

  observers: Set<ComputedNode<any> | EffectNode> | undefined;

  isEqual: IsEqual<T>;
}

interface ReactiveBlock {
  cleanup: Cleanup | undefined;
  errorBoundary: ErrorBoundary | undefined;
  contextTree: ContextTree | undefined;
}

interface ComputedNode<T> extends BaseReactiveNode<true>, ReactiveBlock {
  type: NodeType.Computed;

  value: T;

  compute: () => T;

  isEqual: IsEqual<T>;

  sources: Set<AtomNode<any> | ComputedNode<any>> | undefined;

  observers: Set<ComputedNode<any> | EffectNode> | undefined;
}

const enum EffectType {
  Sync = 0,
  Idle = 1,
}

interface EffectNode extends BaseReactiveNode<true>, ReactiveBlock {
  type: NodeType.Effect;

  effectType: EffectType;

  callback: () => void;

  sources: Set<AtomNode<unknown> | ComputedNode<unknown>> | undefined;
}

const IS_EQUAL = (a: unknown, b: unknown) => a === b || (a !== a && b !== b);

function addSource(
  node: ComputedNode<any> | EffectNode,
  source: ComputedNode<any> | AtomNode<any>,
): void {
  if (!node.sources) {
    node.sources = new Set();
  }
  node.sources.add(source);
}

function addObserver(
  node: ComputedNode<any> | AtomNode<any>,
  observer: ComputedNode<any> | EffectNode,
): void {
  if (!node.observers) {
    node.observers = new Set();
  }
  node.observers.add(observer);
}

function cleanObservers<T>(node: AtomNode<T> | ComputedNode<T>): void {
  if (node.observers) {
    for (const observer of [...node.observers]) {
      if (observer.sources) {
        observer.sources.delete(node);
      }
    }

    node.observers.clear();
  }
}

function cleanSources<T>(node: ComputedNode<T> | EffectNode): void {
  if (node.sources) {
    for (const source of node.sources) {
      if (source.observers) {
        source.observers.delete(node);
      }
    }

    node.sources.clear();
  }
}

let ID = 0;

function getID(): number {
  return ID++;
}

function createAtomNode<T>(
  value: T,
  isEqual: IsEqual<T> = IS_EQUAL,
): AtomNode<T> {
  return {
    id: getID(),
    state: State.Clean,
    alive: true,
    type: NodeType.Atom,
    value,
    observers: undefined,
    isEqual,
  };
}

function createComputedNode<T>(
  compute: () => T,
  isEqual: IsEqual<T> = IS_EQUAL,
): ComputedNode<T> {
  return {
    id: getID(),
    state: State.Uninitialized,
    alive: true,
    type: NodeType.Computed,
    compute,
    value: undefined as T,
    isEqual,
    observers: undefined,
    sources: undefined,
    cleanup: undefined,
    errorBoundary: ERROR_BOUNDARY,
    contextTree: CONTEXT_TREE,
  };
}

function createEffectNode(type: EffectType, callback: () => void): EffectNode {
  return {
    id: getID(),
    state: State.Uninitialized,
    alive: true,
    type: NodeType.Effect,
    effectType: type,
    callback,
    sources: undefined,
    cleanup: undefined,
    errorBoundary: ERROR_BOUNDARY,
    contextTree: CONTEXT_TREE,
  };
}

let TRACKING: EffectNode | ComputedNode<unknown> | undefined;

function destroyNode<T>(
  this: AtomNode<T> | ComputedNode<T> | EffectNode,
): void {
  if (this.alive) {
    this.alive = false;

    if (this.type === NodeType.Computed || this.type === NodeType.Effect) {
      if (this.cleanup) {
        this.cleanup();
      }
      cleanSources(this);
    }

    if (this.type === NodeType.Atom || this.type === NodeType.Computed) {
      cleanObservers(this);
    }
  }
}

function updateNode<T>(node: AtomNode<T> | ComputedNode<T> | EffectNode): void {
  switch (node.type) {
    case NodeType.Atom:
      break;
    case NodeType.Computed:
      runEffect(node);
      break;
    case NodeType.Effect:
      if (node.effectType === EffectType.Sync) {
        runEffect(node);
      } else {
        // TODO schedule
      }
      break;
  }
}

function notifyObservers<T>(
  node: ComputedNode<T> | AtomNode<T>,
  state: State,
): void {
  if (node.observers) {
    // Flip all observers first
    // this is so that effects won't run first.
    const observers = [...node.observers];
    for (const observer of observers) {
      observer.state = state;
    }
    // Then notify
    for (const observer of observers) {
      notifyNode(observer, state);
    }
  }
}

function notifyNode<T>(node: ComputedNode<T> | EffectNode, state: State) {
  if (node.state > state) {
    return;
  }
  if (node.type === NodeType.Computed) {
    notifyObservers(node, State.Check);
  }

  if (node.type === NodeType.Effect && canNodeUpdate(node)) {
    updateNode(node);
  }
}

function canNodeUpdate<T>(
  node: AtomNode<T> | ComputedNode<T> | EffectNode,
): boolean {
  if (!node.alive) {
    return false;
  }
  switch (node.state) {
    case State.Clean:
      return false;
    case State.Check: {
      if (node.sources) {
        for (const source of [...node.sources]) {
          if (canNodeUpdate(source)) {
            updateNode(source);
          }
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

function writeNode<T>(node: AtomNode<T> | ComputedNode<T>, value: T): T {
  if (!node.alive) {
    return node.value;
  }
  node.state = State.Clean;
  if (node.isEqual(node.value, value)) {
    return value;
  }
  node.value = value;
  notifyObservers(node, State.Dirty);
  return value;
}

function readNode<T>(node: AtomNode<T> | ComputedNode<T>): T {
  if (canNodeUpdate(node)) {
    updateNode(node);
  }
  if (TRACKING) {
    addSource(TRACKING, node);
    addObserver(node, TRACKING);
  }
  return node.value;
}

function runObserverInternal<T>(this: ComputedNode<T> | EffectNode): void {
  cleanSources(this);
  const parent = TRACKING;
  const parentErrorBoundary = ERROR_BOUNDARY;
  const parentContext = CONTEXT_TREE;
  TRACKING = this as EffectNode;
  ERROR_BOUNDARY = this.errorBoundary;
  CONTEXT_TREE = this.contextTree;
  try {
    if (this.type === NodeType.Computed) {
      const result = this.compute();
      writeNode(this, result);
    } else {
      this.callback();
    }
  } catch (error) {
    handleError(this.errorBoundary, error);
  } finally {
    TRACKING = parent;
    ERROR_BOUNDARY = parentErrorBoundary;
    CONTEXT_TREE = parentContext;
  }
}

function runEffect<T>(node: ComputedNode<T> | EffectNode): void {
  node.state = State.Clean;
  if (node.cleanup) {
    node.cleanup();
  }
  node.cleanup = batchCleanup((runObserverInternal<T>).bind(node));
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

export function unbatchCleanup<T>(callback: () => T): T {
  const parent = CLEANUP;
  CLEANUP = undefined;
  try {
    return callback();
  } finally {
    CLEANUP = parent;
  }
}

export interface Atom<T> {
  (): T;
  (next: T): T;
}

export interface AtomOptions<T> {
  isEqual?: IsEqual<T>;
}

function atomAction<T>(this: AtomNode<T>, ...args: [] | [T]): T {
  if (args.length === 1) {
    return writeNode(this, args[0]);
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
  const instance = createComputedNode(compute, options?.isEqual);
  onCleanup((destroyNode<T>).bind(instance));
  return (readNode<T>).bind(null, instance);
}

export function syncEffect(callback: () => void): () => void {
  const instance = createEffectNode(EffectType.Sync, callback);
  updateNode(instance);
  return onCleanup(destroyNode.bind(instance));
}

export function effect(callback: () => void): () => void {
  const instance = createEffectNode(EffectType.Idle, callback);
  updateNode(instance);
  return onCleanup(destroyNode.bind(instance));
}

// TODO add transition
