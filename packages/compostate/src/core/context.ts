import { CLEANUP } from '../reactivity/core';
import { onCleanup } from './cleanup-boundary';
import { getCurrentContextTree, popContext, pushContext } from './owner';
import type { Context, ContextTree } from './types';

export function contextual<T>(callback: () => T): T {
  const parent = pushContext({
    parent: getCurrentContextTree(),
    data: {},
  });
  try {
    return callback();
  } finally {
    popContext(parent);
  }
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
  const parent = getCurrentContextTree();
  if (parent) {
    parent.data[context.id] = { value };
    if (CLEANUP) {
      onCleanup(clearContextData.bind(parent, context.id));
    }
  }
}

export function readContext<T>(context: Context<T>): T {
  let current = getCurrentContextTree();
  while (current) {
    const currentData = current.data[context.id];
    if (currentData) {
      return currentData.value;
    }
    if (current) {
      current = current.parent;
    }
  }
  return context.defaultValue;
}
