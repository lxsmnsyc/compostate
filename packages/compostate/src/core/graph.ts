import { createCleanupBoundary, runCleanupBoundary } from './cleanup-boundary';
import { IS_EQUAL } from './constants';
import { handleError } from './error-boundary';
import {
  getCurrentBatchedUpdates,
  getCurrentContextTree,
  getCurrentErrorBoundary,
  getCurrentSuspenseBoundary,
  getCurrentTracker,
  popBatchedUpdates,
  popCleanupBoundary,
  popContext,
  popErrorBoundary,
  popSuspenseBoundary,
  popTracker,
  pushBatchedUpdates,
  pushCleanupBoundary,
  pushContext,
  pushErrorBoundary,
  pushSuspenseBoundary,
  pushTracker,
} from './owner';
import { scheduleCallback } from './scheduler';
import { ResourceNotReadyError, handleSuspense } from './suspense';
import type {
  BatchedUpdates,
  Cleanup,
  CleanupBoundary,
  Computation,
  ContextTree,
  Effect,
  ErrorBoundary,
  IsEqual,
  Ref,
  ResourceComputation,
  SuspenseBoundary,
} from './types';
import { NodeType, ScheduleType, State } from './types';

export type TopTrackableNode<T> = PulseNode | AtomNode<T>;

export type MiddleTrackableNode<T> = ComputedNode<T> | ResourceNode<T>;

export type TrackableNode<T> = TopTrackableNode<T> | MiddleTrackableNode<T>;

export type TrackerNode<T> = ComputedNode<T> | ResourceNode<T> | EffectNode;

export type ReactiveNode<T> = TrackableNode<T> | TrackerNode<T>;

export class Trackable {
  alive = true;
  version = 0;
  // Links to the trackers subscribed to this trackable.
  firstTracker: Link | undefined = undefined;
  lastTracker: Link | undefined = undefined;
  constructor(public parent: TrackableNode<any>) {}
}

// An edge between a trackable and a tracker. It sits in two lists: the
// trackable's trackers and the tracker's trackables.
export class Link {
  prevTracker: Link | undefined = undefined;
  nextTracker: Link | undefined = undefined;
  nextTrackable: Link | undefined = undefined;
  constructor(
    public trackable: Trackable,
    public tracker: Tracker,
    // The trackable's version when the tracker last read it.
    public version: number,
    // The tracker's run that last read the trackable through this link.
    public run: number,
  ) {}
}

export class Tracker {
  alive = true;
  state: State = State.Uninitialized;
  running = false;
  // Links to the trackables read by the last run, in read order.
  firstTrackable: Link | undefined = undefined;
  // While running: the last link that this run has read.
  cursor: Link | undefined = undefined;
  // Counts the runs, so a link can tell whether the current run read it.
  run = 0;
  schedule: Cleanup | undefined = undefined;
  cleanup: CleanupBoundary | undefined = undefined;

  constructor(
    public parent: TrackerNode<any>,
    public scheduleType: ScheduleType,
  ) {}
}

export class PulseNode {
  type: NodeType.Pulse = NodeType.Pulse;

  trackable = new Trackable(this);
}

export class AtomNode<T> {
  type: NodeType.Atom = NodeType.Atom;

  trackable = new Trackable(this);

  constructor(
    public value: T,
    public isEqual: IsEqual<T> = IS_EQUAL,
  ) {}
}

const enum ComputedState {
  Pending = 1,
  Success = 2,
  Failure = 3,
}

type ComputedResult<T> =
  | { type: ComputedState.Success; value: T }
  | { type: ComputedState.Failure; value: unknown }
  | { type: ComputedState.Pending; value: Promise<T> };

export class ComputedNode<T> {
  type: NodeType.Computed = NodeType.Computed;

  trackable = new Trackable(this);

  tracker: Tracker;

  state: ComputedResult<T> | undefined;

  prev: Ref<T> | undefined;

  contextTree: ContextTree | undefined;

  constructor(
    scheduleType: ScheduleType,
    public compute: Computation<T>,
    public isEqual: IsEqual<T> = IS_EQUAL,
  ) {
    this.tracker = new Tracker(this, scheduleType);
    this.contextTree = getCurrentContextTree();
  }
}

export class ResourceNode<T> {
  type: NodeType.Resource = NodeType.Resource;

  trackable = new Trackable(this);

  tracker: Tracker;

  state: ComputedResult<T> | undefined;

  prev: Ref<T> | undefined;

  contextTree: ContextTree | undefined;

  constructor(
    scheduleType: ScheduleType,
    public compute: ResourceComputation<T>,
    public isEqual: IsEqual<T> = IS_EQUAL,
  ) {
    this.tracker = new Tracker(this, scheduleType);
    this.contextTree = getCurrentContextTree();
  }
}

export class EffectNode {
  type: NodeType.Effect = NodeType.Effect;

  tracker: Tracker;

  contextTree: ContextTree | undefined;
  errorBoundary: ErrorBoundary | undefined;
  suspenseBoundary: SuspenseBoundary | undefined;

  constructor(
    scheduleType: ScheduleType,
    public callback: Effect,
  ) {
    this.tracker = new Tracker(this, scheduleType);
    this.suspenseBoundary = getCurrentSuspenseBoundary();
    this.errorBoundary = getCurrentErrorBoundary();
    this.contextTree = getCurrentContextTree();
  }
}

function subscribe(link: Link): void {
  const trackable = link.trackable;
  link.prevTracker = trackable.lastTracker;
  if (trackable.lastTracker) {
    trackable.lastTracker.nextTracker = link;
  } else {
    trackable.firstTracker = link;
  }
  trackable.lastTracker = link;
}

function unsubscribe(link: Link): void {
  const trackable = link.trackable;
  // Dead trackables drop their trackers all at once.
  if (!trackable.alive) {
    return;
  }
  if (link.prevTracker) {
    link.prevTracker.nextTracker = link.nextTracker;
  } else {
    trackable.firstTracker = link.nextTracker;
  }
  if (link.nextTracker) {
    link.nextTracker.prevTracker = link.prevTracker;
  } else {
    trackable.lastTracker = link.prevTracker;
  }
}

function addTrackable(node: Tracker, trackable: Trackable): void {
  const cursor = node.cursor;
  // Same trackable read twice in a row.
  if (cursor && cursor.trackable === trackable) {
    cursor.version = trackable.version;
    return;
  }
  // Most runs read the same trackables in the same order, so compare against
  // the previous run instead of resubscribing everything.
  const next = cursor ? cursor.nextTrackable : node.firstTrackable;
  if (next && next.trackable === trackable) {
    next.version = trackable.version;
    next.run = node.run;
    node.cursor = next;
    return;
  }
  // Same trackable read earlier in this run, with other reads in between.
  // Only a link from this run is reused: an older one may sit after the
  // cursor, and endTracking would unsubscribe it.
  const last = trackable.lastTracker;
  if (last && last.tracker === node && last.run === node.run) {
    last.version = trackable.version;
    return;
  }
  const link = new Link(trackable, node, trackable.version, node.run);
  link.nextTrackable = next;
  if (cursor) {
    cursor.nextTrackable = link;
  } else {
    node.firstTrackable = link;
  }
  node.cursor = link;
  subscribe(link);
}

function startTracking(node: Tracker): void {
  node.running = true;
  node.cursor = undefined;
  node.run++;
}

function endTracking(node: Tracker): void {
  const cursor = node.cursor;
  node.running = false;
  node.cursor = undefined;
  // Links after the cursor were not read by this run.
  let link = cursor ? cursor.nextTrackable : node.firstTrackable;
  if (link) {
    if (cursor) {
      cursor.nextTrackable = undefined;
    } else {
      node.firstTrackable = undefined;
    }
    while (link) {
      unsubscribe(link);
      link = link.nextTrackable;
    }
  }
}

function cleanTrackers(node: Trackable): void {
  // Trackers keep their links to the dead trackable until their next run,
  // which is harmless since dead trackables are never revalidated or tracked.
  node.firstTracker = undefined;
  node.lastTracker = undefined;
}

function cleanTrackables(node: Tracker): void {
  let link = node.firstTrackable;
  node.firstTrackable = undefined;
  while (link) {
    unsubscribe(link);
    link = link.nextTrackable;
  }
}

export function destroyTrackable(instance: Trackable): void {
  if (instance.alive) {
    instance.alive = false;
    cleanTrackers(instance);
  }
}

export function destroyTracker(instance: Tracker): void {
  if (instance.alive) {
    instance.alive = false;
    if (instance.cleanup) {
      runCleanupBoundary(instance.cleanup);
    }
    cleanTrackables(instance);
  }
}

export function destroyAtomNode<T>(this: AtomNode<T>): void {
  destroyTrackable(this.trackable);
}

export function destroyPulseNode(this: PulseNode): void {
  destroyTrackable(this.trackable);
}

export function destroyEffectNode(this: EffectNode): void {
  destroyTracker(this.tracker);
}

export function destroyComputedNode<T>(this: ComputedNode<T>): void {
  destroyTracker(this.tracker);
  destroyTrackable(this.trackable);
}

export function destroyResourceNode<T>(this: ResourceNode<T>): void {
  destroyTracker(this.tracker);
  destroyTrackable(this.trackable);
}

function markTracker(tracker: Tracker, state: State): void {
  // A running tracker is being notified by a trackable it is reading right
  // now or has already read. Only the recorded versions can tell which, so
  // let `isTrackerDirty` decide.
  const next = tracker.running ? State.Check : state;
  // Never downgrade a tracker (e.g. Dirty to Check), and only propagate on
  // the first mark: a tracker that is already marked has already notified
  // everything downstream of it.
  if (tracker.state < next) {
    const wasClean = tracker.state === State.Clean;
    tracker.state = next;
    if (wasClean) {
      if (tracker.parent.type === NodeType.Effect) {
        addUpdate(tracker.parent);
      } else {
        notifyTrackers(tracker.parent.trackable, State.Check);
      }
    }
  }
}

function notifyTrackers(node: Trackable, state: State): void {
  if (!node.alive) {
    return;
  }
  for (let link = node.firstTracker; link; link = link.nextTracker) {
    markTracker(link.tracker, state);
  }
}

export function writeTrackable(node: Trackable, notify: boolean): void {
  if (node.alive) {
    node.version++;
    if (notify) {
      if (getCurrentBatchedUpdates()) {
        notifyTrackers(node, State.Dirty);
      } else {
        // Queue the effects instead of running them while the graph is still
        // being marked.
        batch(notifyTrackers.bind(null, node, State.Dirty));
      }
    }
  }
}

function writePending<T>(
  node: MiddleTrackableNode<T>,
  value: Promise<T>,
): void {
  const shouldNotify = !(
    node.state && node.state.type === ComputedState.Pending
  );
  node.state = { type: ComputedState.Pending, value };
  writeTrackable(node.trackable, shouldNotify);
}

function writeSuccess<T>(node: MiddleTrackableNode<T>, value: T): void {
  if (node.state && node.state.type === ComputedState.Success && node.prev) {
    if (node.isEqual(node.prev.value, value)) {
      return;
    }
  }
  node.prev = { value };
  node.state = { type: ComputedState.Success, value };
  writeTrackable(node.trackable, true);
}

function writeFailure<T>(node: MiddleTrackableNode<T>, error: unknown): void {
  node.state = { type: ComputedState.Failure, value: error };
  writeTrackable(node.trackable, true);
}

export function trackNode<T>(node: TrackableNode<T>): void {
  if (node.trackable.alive) {
    // if there's a tracker accessing this node,
    // mark as an additional tracker to this node
    const tracker = getCurrentTracker();
    if (tracker) {
      addTrackable(tracker, node.trackable);
    }
  }
}

export function readAtomNode<T>(node: AtomNode<T>): T {
  trackNode(node);
  return node.value;
}

export function writeAtomNode<T>(node: AtomNode<T>, value: T): void {
  if (!node.isEqual(node.value, value)) {
    node.value = value;
    writeTrackable(node.trackable, true);
  }
}

function readNodeResult<T>(node: MiddleTrackableNode<T>): T {
  if (node.state) {
    // For pending result, just "throw" to halt the current
    // execution
    if (node.state.type === ComputedState.Pending) {
      // TODO stale boundary
      throw new ResourceNotReadyError(node.state.value);
    }
    if (node.state.type === ComputedState.Success) {
      // If the result succeeded, return
      return node.state.value;
    }
    if (node.state.type === ComputedState.Failure) {
      // ...otherwise, rethrow the error.
      throw node.state.value;
    }
  }
  // This shouldn't happen at all
  throw new Error('Node is uninitialized.');
}

export function readComputedNode<T>(this: ComputedNode<T>): T {
  revalidateComputedNode(this);
  trackNode(this);
  return readNodeResult(this);
}

export function readResourceNode<T>(this: ResourceNode<T>): T {
  revalidateResourceNode(this);
  trackNode(this);
  return readNodeResult(this);
}

function writeTrackerCleanup<T>(
  node: Tracker,
  callback: (value: T) => void,
  value: T,
): void {
  // Clean previous cleanup boundary
  if (node.cleanup) {
    runCleanupBoundary(node.cleanup);
  }
  // Create a new cleanup boundary. Assign it before running so that a rerun
  // triggered from inside the callback cleans this run up.
  const boundary = createCleanupBoundary();
  node.cleanup = boundary;
  const parent = pushCleanupBoundary(boundary);
  try {
    callback(value);
  } finally {
    popCleanupBoundary(parent);
  }
}

function runComputedInternal<T>(node: ComputedNode<T>): void {
  // Clean the observables
  startTracking(node.tracker);
  // Remount owners
  const parentSuspenseBoundary = pushSuspenseBoundary(undefined);
  const parentErrorBoundary = pushErrorBoundary(undefined);
  const parentContext = pushContext(undefined);
  const parentTracker = pushTracker(node.tracker);
  try {
    // Resolve computation
    writeSuccess(node, node.compute(node.prev));
  } catch (error) {
    // Computation failed, memoize the error
    writeFailure(node, error);
  } finally {
    popTracker(parentTracker);
    endTracking(node.tracker);
    popContext(parentContext);
    popErrorBoundary(parentErrorBoundary);
    popSuspenseBoundary(parentSuspenseBoundary);
  }
}

function runComputed<T>(node: ComputedNode<T>): void {
  if (!node.trackable.alive) {
    return;
  }
  node.tracker.state = State.Clean;
  writeTrackerCleanup(node.tracker, runComputedInternal<T>, node);
}

function runEffectInternal(node: EffectNode): void {
  startTracking(node.tracker);
  const updates = createBatchedUpdates();
  const parentBatchedUpdates = pushBatchedUpdates(updates);
  const parentTracker = pushTracker(node.tracker);
  const parentSuspenseBoundary = pushSuspenseBoundary(node.suspenseBoundary);
  const parentErrorBoundary = pushErrorBoundary(node.errorBoundary);
  const parentContext = pushContext(node.contextTree);
  try {
    node.callback();
  } catch (error) {
    // If error is a Suspense marker, we wait
    if (error instanceof ResourceNotReadyError) {
      handleSuspense(node.suspenseBoundary);
    } else {
      // Pass error to the error boundary
      handleError(node.errorBoundary, error);
    }
  } finally {
    popContext(parentContext);
    popErrorBoundary(parentErrorBoundary);
    popSuspenseBoundary(parentSuspenseBoundary);
    popTracker(parentTracker);
    endTracking(node.tracker);
    popBatchedUpdates(parentBatchedUpdates);

    runBatchedUpdates(updates);
  }
}

function runEffect(node: EffectNode): void {
  if (!node.tracker.alive) {
    return;
  }
  node.tracker.state = State.Clean;
  writeTrackerCleanup(node.tracker, runEffectInternal, node);
}

function resolveResource<T>(
  this: ResourceNode<T>,
  version: number,
  value: T,
): void {
  // Make sure that the we are going to write to the latest version
  if (this.trackable.version === version) {
    writeSuccess(this, value);
  }
}

function rejectResource<T>(
  this: ResourceNode<T>,
  version: number,
  value: unknown,
): void {
  // Make sure that the we are going to write to the latest version
  if (this.trackable.version === version) {
    writeFailure(this, value);
  }
}

function runResourceInternal<T>(node: ResourceNode<T>): void {
  startTracking(node.tracker);
  const parentSuspenseBoundary = pushSuspenseBoundary(undefined);
  const parentErrorBoundary = pushErrorBoundary(undefined);
  const parentContext = pushContext(undefined);
  const parentTracker = pushTracker(node.tracker);
  try {
    // Force into a Promise
    const result = Promise.resolve(node.compute(node.prev));
    // Set node to pending state
    // TODO: do not write pending during transition state
    writePending(node, result);
    // Get current version
    const version = node.trackable.version;
    // Update the node when the promise resolves
    result.then(
      (resolveResource<T>).bind(node, version),
      (rejectResource<T>).bind(node, version),
    );
  } catch (error) {
    // Memoize error
    writeFailure(node, error);
  } finally {
    popTracker(parentTracker);
    endTracking(node.tracker);
    popContext(parentContext);
    popErrorBoundary(parentErrorBoundary);
    popSuspenseBoundary(parentSuspenseBoundary);
  }
}
function runResource<T>(node: ResourceNode<T>): void {
  if (!node.trackable.alive) {
    return;
  }
  node.tracker.state = State.Clean;
  writeTrackerCleanup(node.tracker, runResourceInternal<T>, node);
}

function writeTrackerSchedule(node: Tracker, callback: Effect): void {
  if (node.schedule) {
    node.schedule();
  }
  node.schedule = scheduleCallback(callback);
}

function updateComputed<T>(node: ComputedNode<T>): void {
  if (
    node.tracker.scheduleType === ScheduleType.Sync ||
    node.tracker.state === State.Uninitialized
  ) {
    runComputed(node);
  } else {
    writeTrackerSchedule(node.tracker, (runComputed<T>).bind(null, node));
  }
}

function updateEffect(node: EffectNode): void {
  if (node.tracker.scheduleType === ScheduleType.Sync) {
    runEffect(node);
  } else {
    writeTrackerSchedule(node.tracker, runEffect.bind(null, node));
  }
}

function updateResource<T>(node: ResourceNode<T>): void {
  runResource(node);
}

function isTrackerDirty(node: Tracker): boolean {
  // Check if one of the trackables are dirty
  for (let link = node.firstTrackable; link; link = link.nextTrackable) {
    const trackable = link.trackable;
    const parent = trackable.parent;
    if (parent.type === NodeType.Computed) {
      revalidateComputedNode(parent);
    } else if (parent.type === NodeType.Resource) {
      revalidateResourceNode(parent);
    }
    if (node.state === State.Dirty || trackable.version !== link.version) {
      node.state = State.Dirty;
      return true;
    }
  }
  node.state = State.Clean;
  return false;
}

function canTrackerUpdate(node: Tracker): boolean {
  if (!node.alive) {
    return false;
  }
  switch (node.state) {
    case State.Clean:
      return false;
    case State.Check:
      return isTrackerDirty(node);
    case State.Dirty:
    case State.Uninitialized:
      return true;
  }
}

export function revalidateComputedNode<T>(node: ComputedNode<T>): void {
  if (canTrackerUpdate(node.tracker)) {
    updateComputed(node);
  }
}
export function revalidateResourceNode<T>(node: ResourceNode<T>): void {
  if (canTrackerUpdate(node.tracker)) {
    updateResource(node);
  }
}
export function revalidateEffectNode(node: EffectNode): void {
  if (canTrackerUpdate(node.tracker)) {
    updateEffect(node);
  }
}

function flushUpdates(batchedUpdates: BatchedUpdates): void {
  const effects = batchedUpdates.effects;
  if (effects) {
    // Effects queued while flushing are appended and run in the same loop.
    for (let i = 0; i < effects.length; i++) {
      const effect = effects[i];
      if (canTrackerUpdate(effect.tracker)) {
        updateEffect(effect);
      }
    }
    batchedUpdates.effects = undefined;
  }
}

function addUpdate(effect: EffectNode): void {
  const updates = getCurrentBatchedUpdates()!;
  if (updates.effects) {
    updates.effects.push(effect);
  } else {
    updates.effects = [effect];
  }
}

export function unbatch<T>(callback: () => T): T {
  const parent = pushBatchedUpdates(undefined);
  try {
    return callback();
  } finally {
    popBatchedUpdates(parent);
  }
}

function createBatchedUpdates(): BatchedUpdates {
  return {
    effects: undefined,
  };
}

function runBatchedUpdates(updates: BatchedUpdates): void {
  // Keep the batch current while flushing so that writes made by the flushed
  // effects are queued instead of running effects re-entrantly.
  const parent = pushBatchedUpdates(updates);
  try {
    flushUpdates(updates);
  } finally {
    popBatchedUpdates(parent);
  }
}

export function batch<T>(callback: () => T): T {
  const current = getCurrentBatchedUpdates();
  if (current) {
    return callback();
  }
  const instance = createBatchedUpdates();
  const parent = pushBatchedUpdates(instance);
  try {
    return callback();
  } finally {
    popBatchedUpdates(parent);
    runBatchedUpdates(instance);
  }
}

// TODO add transition
