import type { Tracker } from './graph';
import type {
  BatchedUpdates,
  CleanupBoundary,
  ContextTree,
  ErrorBoundary,
  SuspenseBoundary,
} from './types';

let CONTEXT_TREE: ContextTree | undefined;

export function pushContext(
  context: ContextTree | undefined,
): ContextTree | undefined {
  const parent = CONTEXT_TREE;
  CONTEXT_TREE = context;
  return parent;
}

export function popContext(context: ContextTree | undefined): void {
  CONTEXT_TREE = context;
}

export function getCurrentContextTree(): ContextTree | undefined {
  return CONTEXT_TREE;
}

let CLEANUP_BOUNDARY: CleanupBoundary | undefined;

export function pushCleanupBoundary(
  boundary: CleanupBoundary | undefined,
): CleanupBoundary | undefined {
  const parent = CLEANUP_BOUNDARY;
  CLEANUP_BOUNDARY = boundary;
  return parent;
}

export function popCleanupBoundary(
  boundary: CleanupBoundary | undefined,
): void {
  CLEANUP_BOUNDARY = boundary;
}

export function getCurrentCleanupBoundary(): CleanupBoundary | undefined {
  return CLEANUP_BOUNDARY;
}

let ERROR_BOUNDARY: ErrorBoundary | undefined;

export function pushErrorBoundary(
  boundary: ErrorBoundary | undefined,
): ErrorBoundary | undefined {
  const parent = ERROR_BOUNDARY;
  ERROR_BOUNDARY = boundary;
  return parent;
}

export function popErrorBoundary(boundary: ErrorBoundary | undefined): void {
  ERROR_BOUNDARY = boundary;
}

export function getCurrentErrorBoundary(): ErrorBoundary | undefined {
  return ERROR_BOUNDARY;
}

let TRACKER: Tracker | undefined;

export function pushTracker(tracker: Tracker | undefined): Tracker | undefined {
  const parent = TRACKER;
  TRACKER = tracker;
  return parent;
}

export function popTracker(tracker: Tracker | undefined): void {
  TRACKER = tracker;
}

export function getCurrentTracker(): Tracker | undefined {
  return TRACKER;
}

let SUSPENSE_BOUNDARY: SuspenseBoundary | undefined;

export function pushSuspenseBoundary(
  boundary: SuspenseBoundary | undefined,
): SuspenseBoundary | undefined {
  const parent = SUSPENSE_BOUNDARY;
  SUSPENSE_BOUNDARY = boundary;
  return parent;
}

export function popSuspenseBoundary(
  boundary: SuspenseBoundary | undefined,
): void {
  SUSPENSE_BOUNDARY = boundary;
}

export function getCurrentSuspenseBoundary(): SuspenseBoundary | undefined {
  return SUSPENSE_BOUNDARY;
}

let BATCHED_UPDATES: BatchedUpdates | undefined;

export function pushBatchedUpdates(
  boundary: BatchedUpdates | undefined,
): BatchedUpdates | undefined {
  const parent = BATCHED_UPDATES;
  BATCHED_UPDATES = boundary;
  return parent;
}

export function popBatchedUpdates(boundary: BatchedUpdates | undefined): void {
  BATCHED_UPDATES = boundary;
}

export function getCurrentBatchedUpdates(): BatchedUpdates | undefined {
  return BATCHED_UPDATES;
}
