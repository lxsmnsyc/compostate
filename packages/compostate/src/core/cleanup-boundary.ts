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
  if (instance.cleanups) {
    instance.cleanups.push(cleanup);
  } else {
    instance.cleanups = [cleanup];
  }
}

export function runCleanupBoundary(instance: CleanupBoundary): void {
  if (instance.alive) {
    instance.alive = false;

    const cleanups = instance.cleanups;
    if (cleanups) {
      instance.cleanups = undefined;
      const parent = pushTracker(undefined);
      try {
        for (let i = 0; i < cleanups.length; i++) {
          cleanups[i]();
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

export function createCleanupBoundary(): CleanupBoundary {
  return {
    alive: true,
    cleanups: undefined,
  };
}

export function batchCleanup(callback: Effect): Effect {
  const boundary = createCleanupBoundary();
  const parent = pushCleanupBoundary(boundary);
  try {
    callback();
  } finally {
    popCleanupBoundary(parent);
  }

  return onCleanup(runCleanupBoundary.bind(null, boundary));
}

export function unbatchCleanup<T>(callback: () => T): T {
  const parent = pushCleanupBoundary(undefined);
  try {
    return callback();
  } finally {
    popCleanupBoundary(parent);
  }
}
