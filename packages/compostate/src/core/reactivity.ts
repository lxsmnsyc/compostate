import { onCleanup } from './cleanup-boundary';
import {
  createAtomNode,
  createComputedNode,
  createEffectNode,
  destroyNode,
  readNode,
  updateNode,
  writeNode,
} from './graph';
import { type AtomNode, type Effect, EffectType, type IsEqual } from './types';

export interface Atom<T> {
  (): T;
  (next: T): T;
}

export interface AtomOptions<T> {
  isEqual?: IsEqual<T>;
}

function atomAction<T>(this: AtomNode<T>, ...args: [] | [T]): T {
  if (args.length === 1) {
    return writeNode(this, args[0]);
  }
  return readNode(this);
}

export function atom<T>(value: T, options?: AtomOptions<T>): Atom<T> {
  const instance = createAtomNode(value, options?.isEqual);
  onCleanup((destroyNode<T>).bind(instance));
  return (atomAction<T>).bind(instance);
}

export interface ComputedOptions<T> {
  isEqual?: IsEqual<T>;
}

export function computed<T>(
  compute: () => T,
  options?: ComputedOptions<T>,
): () => T {
  const instance = createComputedNode(compute, options?.isEqual);
  onCleanup((destroyNode<T>).bind(instance));
  return (readNode<T>).bind(null, instance);
}

export function syncEffect(callback: Effect): () => void {
  const instance = createEffectNode(EffectType.Sync, callback);
  updateNode(instance);
  return onCleanup(destroyNode.bind(instance));
}

export function effect(callback: Effect): () => void {
  const instance = createEffectNode(EffectType.Idle, callback);
  updateNode(instance);
  return onCleanup(destroyNode.bind(instance));
}
