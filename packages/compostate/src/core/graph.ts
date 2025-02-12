import { batchCleanup } from './cleanup-boundary';
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

let TRACKABLE_ID = 0;

function getTrackableId(): number {
  return TRACKABLE_ID++;
}

export class Trackable {
  id = getTrackableId();
  alive = true;
  version = 0;
  trackers: Set<Tracker> | undefined = undefined;
  constructor(public parent: TrackableNode<any>) {}
}

let TRACKER_ID = 0;

function getTrackerID(): number {
  return TRACKER_ID++;
}

export class Tracker {
  id = getTrackerID();
  alive = true;
  state: State = State.Uninitialized;
  trackables: Set<Trackable> | undefined = undefined;
  schedule: Cleanup | undefined = undefined;
  cleanup: Cleanup | undefined = undefined;

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

  trackable: Trackable;

  value: T;

  constructor(
    value: T,
    public isEqual: IsEqual<T> = IS_EQUAL,
  ) {
    this.trackable = new Trackable(this);
    this.value = value;
  }
}

const enum ComputedState {
  Uninitialized = 0,
  Pending = 1,
  Success = 2,
  Failure = 3,
}

export class ComputedNode<T> {
  type: NodeType.Computed = NodeType.Computed;

  trackable: Trackable;

  tracker: Tracker;

  state: ComputedState = ComputedState.Uninitialized;

  value: Ref<T> | undefined;

  error: Ref<unknown> | undefined;

  contextTree: ContextTree | undefined;

  constructor(
    scheduleType: ScheduleType,
    public compute: Computation<T>,
    public isEqual: IsEqual<T> = IS_EQUAL,
  ) {
    this.trackable = new Trackable(this);
    this.tracker = new Tracker(this, scheduleType);
    this.contextTree = getCurrentContextTree();
  }
}

export class ResourceNode<T> {
  type: NodeType.Resource = NodeType.Resource;

  trackable: Trackable;

  tracker: Tracker;

  state: ComputedState = ComputedState.Uninitialized;

  value: Ref<T> | undefined;

  error: Ref<unknown> | undefined;

  contextTree: ContextTree | undefined;

  constructor(
    scheduleType: ScheduleType,
    public compute: ResourceComputation<T>,
    public isEqual: IsEqual<T> = IS_EQUAL,
  ) {
    this.trackable = new Trackable(this);
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

function addTrackable(node: Tracker, trackable: Trackable): void {
  if (!node.trackables) {
    node.trackables = new Set();
  }
  node.trackables.add(trackable);
}

function addTracker(node: Trackable, tracker: Tracker): void {
  if (!node.trackers) {
    node.trackers = new Set();
  }
  node.trackers.add(tracker);
}

function cleanTrackers(node: Trackable): void {
  if (!(node.trackers && node.trackers.size)) {
    return;
  }
  for (const tracker of [...node.trackers]) {
    if (tracker.trackables) {
      tracker.trackables.delete(node);
    }
  }
  node.trackers.clear();
}

function cleanTrackables(node: Tracker): void {
  if (!(node.trackables && node.trackables.size)) {
    return;
  }
  for (const trackable of [...node.trackables]) {
    if (trackable.trackers) {
      trackable.trackers.delete(node);
    }
  }

  node.trackables.clear();
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
      instance.cleanup();
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

function notifyTrackers(node: Trackable, state: State): void {
  if (!(node.alive && node.trackers && node.trackers.size)) {
    return;
  }
  const trackers = [...node.trackers];
  // Mark trackers with the new state
  for (const tracker of trackers) {
    tracker.state = state;
  }
  // 1st step, notify each tracker with the new state
  // This is a recursive process, which defers
  // any effects from immediately occuring
  for (const tracker of trackers) {
    if (tracker.parent.type !== NodeType.Effect) {
      notifyTrackers(tracker.parent.trackable, State.Check);
    }
  }
  // 2nd step, run the effects.
  for (const tracker of trackers) {
    if (tracker.parent.type === NodeType.Effect) {
      addUpdate(tracker.parent);
    }
  }
}

export function writeTrackable(node: Trackable, notify: boolean): void {
  if (node.alive) {
    node.version++;
    if (notify) {
      notifyTrackers(node, State.Dirty);
    }
  }
}

function writePending<T>(node: MiddleTrackableNode<T>): void {
  if (node.state === ComputedState.Pending) {
    writeTrackable(node.trackable, false);
  } else {
    node.state = ComputedState.Pending;
    writeTrackable(node.trackable, true);
  }
}

function writeSuccess<T>(node: MiddleTrackableNode<T>, value: T): void {
  if (node.state === ComputedState.Success && node.value) {
    if (node.isEqual(node.value.value, value)) {
      return;
    }
  }
  node.state = ComputedState.Success;
  node.value = { value };
  writeTrackable(node.trackable, true);
}

function writeFailure<T>(node: MiddleTrackableNode<T>, error: unknown): void {
  node.state = ComputedState.Failure;
  node.error = { value: error };
  writeTrackable(node.trackable, true);
}

export function trackNode<T>(node: TrackableNode<T>): void {
  // if there's a tracker accessing this node,
  // mark as an additional tracker to this node
  const tracker = getCurrentTracker();
  if (tracker) {
    addTrackable(tracker, node.trackable);
    addTracker(node.trackable, tracker);
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
  // For pending result, just "throw" to halt the current
  // execution
  if (node.state === ComputedState.Pending) {
    // TODO stale boundary
    throw new ResourceNotReadyError();
  }
  if (node.state === ComputedState.Success && node.value) {
    // If the result succeeded, return
    return node.value.value;
  }
  if (node.state === ComputedState.Failure && node.error) {
    // ...otherwise, rethrow the error.
    throw node.error.value;
  }
  // This shouldn't happen at all
  throw new Error('unreachable');
}

export function readNode<T>(node: MiddleTrackableNode<T>): T {
  revalidateNode(node);
  trackNode(node);
  return readNodeResult(node);
}

function writeTrackerCleanup(node: Tracker, cleanup: Cleanup): void {
  // Clean previous cleanup boundary
  if (node.cleanup) {
    node.cleanup();
  }
  // Create a new cleanup boundary
  const parent = pushCleanupBoundary(undefined);
  node.cleanup = batchCleanup(cleanup);
  popCleanupBoundary(parent);
}

function runComputedInternal<T>(this: ComputedNode<T>): void {
  // Clean the observables
  cleanTrackables(this.tracker);
  // Remount owners
  const parentSuspenseBoundary = pushSuspenseBoundary(undefined);
  const parentErrorBoundary = pushErrorBoundary(undefined);
  const parentContext = pushContext(undefined);
  const parentTracker = pushTracker(this.tracker);
  try {
    // Resolve computation
    writeSuccess(this, this.compute(this.value));
  } catch (error) {
    // Computation failed, memoize the error
    writeFailure(this, error);
  } finally {
    popTracker(parentTracker);
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
  writeTrackerCleanup(node.tracker, (runComputedInternal<T>).bind(node));
}

function runEffectInternal(this: EffectNode): void {
  cleanTrackables(this.tracker);
  const updates = createBatchedUpdates();
  const parentBatchedUpdates = pushBatchedUpdates(updates);
  const parentTracker = pushTracker(this.tracker);
  const parentSuspenseBoundary = pushSuspenseBoundary(this.suspenseBoundary);
  const parentErrorBoundary = pushErrorBoundary(this.errorBoundary);
  const parentContext = pushContext(this.contextTree);
  try {
    this.callback();
  } catch (error) {
    // If error is a Suspense marker, we wait
    if (error instanceof ResourceNotReadyError) {
      handleSuspense(this.suspenseBoundary);
    } else {
      // Pass error to the error boundary
      handleError(this.errorBoundary, error);
    }
  } finally {
    popContext(parentContext);
    popErrorBoundary(parentErrorBoundary);
    popSuspenseBoundary(parentSuspenseBoundary);
    popTracker(parentTracker);
    popBatchedUpdates(parentBatchedUpdates);

    flushUpdates(updates);
  }
}

function runEffect(node: EffectNode): void {
  if (!node.tracker.alive) {
    return;
  }
  node.tracker.state = State.Clean;
  writeTrackerCleanup(node.tracker, runEffectInternal.bind(node));
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

function runResourceInternal<T>(this: ResourceNode<T>): void {
  cleanTrackables(this.tracker);
  const parentSuspenseBoundary = pushSuspenseBoundary(undefined);
  const parentErrorBoundary = pushErrorBoundary(undefined);
  const parentContext = pushContext(undefined);
  const parentTracker = pushTracker(this.tracker);
  try {
    // Force into a Promise
    const result = Promise.resolve(this.compute(this.value));
    // Set node to pending state
    // TODO: do not write pending during transition state
    writePending(this);
    // Get current version
    const version = this.trackable.version;
    // Update the node when the promise resolves
    result.then(
      (resolveResource<T>).bind(this, version),
      (rejectResource<T>).bind(this, version),
    );
  } catch (error) {
    // Memoize error
    writeFailure(this, error);
  } finally {
    popTracker(parentTracker);
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
  writeTrackerCleanup(node.tracker, (runResourceInternal<T>).bind(node));
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

function isTopTrackable<T>(
  trackable: TrackableNode<T>,
): trackable is TopTrackableNode<T> {
  switch (trackable.type) {
    case NodeType.Atom:
    case NodeType.Pulse:
      return true;
    case NodeType.Resource:
    case NodeType.Computed:
      return false;
  }
}

function isTrackerDirty(node: Tracker): boolean {
  // Check if one of the trackables are dirty
  if (node.trackables && node.trackables.size) {
    for (const trackable of [...node.trackables]) {
      if (!isTopTrackable(trackable.parent)) {
        revalidateNode(trackable.parent);
        if ((node as any).state === State.Dirty) {
          return true;
        }
      }
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

export function revalidateNode<T>(node: TrackerNode<T>): void {
  if (!canTrackerUpdate(node.tracker)) {
    return;
  }
  switch (node.type) {
    case NodeType.Computed:
      updateComputed(node);
      break;
    case NodeType.Effect:
      updateEffect(node);
      break;
    case NodeType.Resource:
      updateResource(node);
      break;
  }
}

function flushUpdates(batchedUpdates: BatchedUpdates): void {
  if (batchedUpdates.effects && batchedUpdates.effects.size) {
    for (const effect of batchedUpdates.effects) {
      if (canTrackerUpdate(effect.tracker)) {
        updateEffect(effect);
      }
    }
  }
}

function addUpdate(effect: EffectNode): void {
  const updates = getCurrentBatchedUpdates();
  if (updates) {
    if (!updates.effects) {
      updates.effects = new Set();
    }
    updates.effects.add(effect);
  } else {
    revalidateNode(effect);
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
    flushUpdates(instance);
  }
}

// TODO add transition
