import { onCleanup } from './cleanup-boundary';
import { NO_OP } from './constants';
import {
  getCurrentSuspenseBoundary,
  popSuspenseBoundary,
  popTracker,
  pushSuspenseBoundary,
  pushTracker,
} from './owner';
import type { Cleanup, SuspenseBoundary, SuspenseHandler } from './types';

export class ResourceNotReadyError<T> extends Error {
  constructor(readonly request: Promise<T>) {
    super('Resource is not yet ready.');
  }
}

export function handleSuspense(boundary: SuspenseBoundary | undefined): void {
  if (!boundary) {
    return;
  }
  if (boundary.handlers && boundary.handlers.size) {
    const parent = pushTracker(undefined);
    try {
      for (const handler of boundary.handlers) {
        handler();
      }
    } finally {
      popTracker(parent);
    }
  }
}

function addSuspenseHandler(
  instance: SuspenseBoundary,
  handler: SuspenseHandler,
): void {
  if (!instance.handlers) {
    instance.handlers = new Set();
  }
  instance.handlers.add(handler);
}

function removeSuspenseHandler(
  this: SuspenseBoundary,
  handler: SuspenseHandler,
): void {
  if (this.handlers) {
    this.handlers.delete(handler);
  }
}

export function onSuspend(handler: SuspenseHandler): Cleanup {
  const current = getCurrentSuspenseBoundary();
  if (current) {
    addSuspenseHandler(current, handler);
    return onCleanup(removeSuspenseHandler.bind(current, handler));
  }
  return NO_OP;
}

export function suspenseBoundary<T>(callback: () => T): T {
  const parent = pushSuspenseBoundary({
    handlers: undefined,
  });
  try {
    return callback();
  } finally {
    popSuspenseBoundary(parent);
  }
}

export function isPending<T>(callback: () => T): boolean {
  try {
    callback();
    return false;
  } catch (error) {
    return error instanceof ResourceNotReadyError;
  }
}
