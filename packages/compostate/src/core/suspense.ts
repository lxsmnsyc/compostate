import {
  popSuspenseBoundary,
  popTracker,
  pushSuspenseBoundary,
  pushTracker,
} from './owner';
import type { SuspenseBoundary, SuspenseHandler } from './types';

export class ResourceNotReadyError<T> extends Error {
  constructor(readonly request: Promise<T>) {
    super('Resource is not yet ready.');
  }
}

export function handleSuspense(boundary: SuspenseBoundary | undefined): void {
  if (!boundary) {
    return;
  }
  const parent = pushTracker(undefined);
  try {
    boundary.handler();
  } finally {
    popTracker(parent);
  }
}

export function suspenseBoundary<T>(
  callback: () => T,
  handler: SuspenseHandler,
): T {
  const parent = pushSuspenseBoundary({
    handler,
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
