import { batchCleanup } from './cleanup-boundary';
import { IS_EQUAL } from './constants';
import { handleError } from './error-boundary';
import {
  getCurrentContextTree,
  getCurrentErrorBoundary,
  getCurrentObserver,
  popContext,
  popErrorBoundary,
  popObserver,
  pushContext,
  pushErrorBoundary,
  pushObserver,
} from './owner';
import {
  type AtomNode,
  type ComputedNode,
  type EffectNode,
  EffectType,
  type IsEqual,
  NodeType,
  type ObservableNode,
  type ObserverNode,
  State,
} from './types';

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
    value,
    isEqual,
    computeds: undefined,
    effects: undefined,
  };
}

export function createComputedNode<T>(
  compute: () => T,
  isEqual: IsEqual<T> = IS_EQUAL,
): ComputedNode<T> {
  return {
    id: getID(),
    state: State.Uninitialized,
    alive: true,
    type: NodeType.Computed,
    value: undefined as T,
    isEqual,
    computeds: undefined,
    effects: undefined,
    compute,
    sources: undefined,
    cleanup: undefined,
    errorBoundary: getCurrentErrorBoundary(),
    contextTree: getCurrentContextTree(),
  };
}

export function createEffectNode(
  type: EffectType,
  callback: () => void,
): EffectNode {
  return {
    id: getID(),
    state: State.Uninitialized,
    alive: true,
    type: NodeType.Effect,
    effectType: type,
    callback,
    sources: undefined,
    cleanup: undefined,
    errorBoundary: getCurrentErrorBoundary(),
    contextTree: getCurrentContextTree(),
  };
}

function addObservable(node: ObserverNode, source: ObservableNode): void {
  if (!node.sources) {
    node.sources = new Set();
  }
  node.sources.add(source);
}

function addObserver(node: ObservableNode, observer: ObserverNode): void {
  if (observer.type === NodeType.Effect) {
    if (!node.effects) {
      node.effects = new Set();
    }
    node.effects.add(observer);
  } else {
    if (!node.computeds) {
      node.computeds = new Set();
    }
    node.computeds.add(observer);
  }
}

function cleanObservers<T>(node: AtomNode<T> | ComputedNode<T>): void {
  if (node.computeds) {
    for (const observer of [...node.computeds]) {
      if (observer.sources) {
        observer.sources.delete(node);
      }
    }

    node.computeds.clear();
  }
  if (node.effects) {
    for (const observer of [...node.effects]) {
      if (observer.sources) {
        observer.sources.delete(node);
      }
    }

    node.effects.clear();
  }
}

function cleanObservables<T>(node: ComputedNode<T> | EffectNode): void {
  if (!node.sources) {
    return;
  }
  if (node.type === NodeType.Effect) {
    for (const source of node.sources) {
      if (source.effects) {
        source.effects.delete(node);
      }
    }
  } else {
    for (const source of node.sources) {
      if (source.computeds) {
        source.computeds.delete(node);
      }
    }
  }

  node.sources.clear();
}

export function destroyNode<T>(
  this: AtomNode<T> | ComputedNode<T> | EffectNode,
): void {
  if (this.alive) {
    this.alive = false;

    if (this.type === NodeType.Computed || this.type === NodeType.Effect) {
      if (this.cleanup) {
        this.cleanup();
      }
      cleanObservables(this);
    }

    if (this.type === NodeType.Atom || this.type === NodeType.Computed) {
      cleanObservers(this);
    }
  }
}

function notifyObservers<T>(
  node: ComputedNode<T> | AtomNode<T>,
  state: State,
): void {
  if (node.computeds) {
    // Then notify
    const computeds = [...node.computeds];
    for (const computed of computeds) {
      computed.state = state;
    }
    for (const computed of computeds) {
      notifyObservers(computed, State.Check);
    }
  }
  if (node.effects) {
    const effects = [...node.effects];
    for (const effect of effects) {
      effect.state = state;
    }
    for (const effect of effects) {
      updateNode(effect);
    }
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

export function writeNode<T>(node: AtomNode<T> | ComputedNode<T>, value: T): T {
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

export function readNode<T>(node: AtomNode<T> | ComputedNode<T>): T {
  updateNode(node);
  const observer = getCurrentObserver();
  if (observer) {
    addObservable(observer, node);
    addObserver(node, observer);
  }
  return node.value;
}

function runObserverInternal<T>(this: ComputedNode<T> | EffectNode): void {
  cleanObservables(this);
  const parentObserver = pushObserver(this);
  const parentErrorBoundary = pushErrorBoundary(this.errorBoundary);
  const parentContext = pushContext(this.contextTree);
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
    popObserver(parentObserver);
    popErrorBoundary(parentErrorBoundary);
    popContext(parentContext);
  }
}

function runEffect<T>(node: ComputedNode<T> | EffectNode): void {
  node.state = State.Clean;
  if (node.cleanup) {
    node.cleanup();
  }
  node.cleanup = batchCleanup((runObserverInternal<T>).bind(node));
}

export function updateNode<T>(
  node: AtomNode<T> | ComputedNode<T> | EffectNode,
): void {
  if (!canNodeUpdate(node)) {
    return;
  }
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

export function untrack<T>(callback: () => T): T {
  const parent = pushObserver(undefined);
  try {
    return callback();
  } finally {
    popObserver(parent);
  }
}

// TODO add transition
