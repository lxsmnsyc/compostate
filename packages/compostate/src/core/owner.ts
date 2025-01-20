import type {
  CleanupBoundary,
  ContextTree,
  ErrorBoundary,
  ObserverNode,
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

let CLEANUP: CleanupBoundary | undefined;

export function pushCleanupBoundary(
  boundary: CleanupBoundary | undefined,
): CleanupBoundary | undefined {
  const parent = CLEANUP;
  CLEANUP = boundary;
  return parent;
}

export function popCleanupBoundary(
  boundary: CleanupBoundary | undefined,
): void {
  CLEANUP = boundary;
}

export function getCurrentCleanupBoundary(): CleanupBoundary | undefined {
  return CLEANUP;
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

let OBSERVER: ObserverNode<any> | undefined;

export function pushObserver(
  observer: ObserverNode<any> | undefined,
): ObserverNode<any> | undefined {
  const parent = OBSERVER;
  OBSERVER = observer;
  return parent;
}

export function popObserver(observer: ObserverNode<any> | undefined): void {
  OBSERVER = observer;
}

export function getCurrentObserver(): ObserverNode<any> | undefined {
  return OBSERVER;
}
