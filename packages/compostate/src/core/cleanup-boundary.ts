import {
  getCurrentCleanupBoundary,
  popCleanupBoundary,
  popTracker,
  pushCleanupBoundary,
  pushTracker,
} from './owner';
import type { Cleanup, CleanupBoundary, Effect } from './types';

function addCleanup(instance: CleanupBoundary, cleanup: Cleanup): void {
  // so it's easier to change
  if (!instance.cleanups) {
    instance.cleanups = new Set();
  }
  instance.cleanups.add(cleanup);
}

function runCleanup(this: CleanupBoundary): void {
  if (this.alive) {
    this.alive = false;

    if (this.cleanups && this.cleanups.size) {
      const parent = pushTracker(undefined);
      try {
        for (const cleanup of this.cleanups) {
          cleanup();
        }
      } finally {
        popTracker(parent);
      }
    }
  }
}

export function onCleanup(callback: Cleanup): Cleanup {
  const current = getCurrentCleanupBoundary();
  if (current) {
    addCleanup(current, callback);
  }
  return callback;
}

export function batchCleanup(callback: Effect): Effect {
  const boundary: CleanupBoundary = {
    alive: true,
    cleanups: undefined,
  };
  const parent = pushCleanupBoundary(boundary);
  try {
    callback();
  } finally {
    popCleanupBoundary(parent);
  }

  return onCleanup(runCleanup.bind(boundary));
}

export function unbatchCleanup<T>(callback: () => T): T {
  const parent = pushCleanupBoundary(undefined);
  try {
    return callback();
  } finally {
    popCleanupBoundary(parent);
  }
}
