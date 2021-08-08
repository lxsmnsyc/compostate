import batch from '../batch';
import batchCleanup from '../batch-cleanup';
import { Cleanup, Effect } from '../types';
import {
  ErrorBoundary,
  ERROR_BOUNDARY,
  handleError,
  setErrorBoundary,
} from './error-boundary';
import {
  createLinkedWork,
  destroyLinkedWork,
  LinkedWork,
  runLinkedWork,
  setTracking,
  TRACKING,
  unlinkLinkedWorkDependencies,
} from './linked-work';

export let BATCH_EFFECTS: EffectNode[] | undefined;

export function setBatchEffects(instance: EffectNode[] | undefined): void {
  BATCH_EFFECTS = instance;
}

export interface EffectNode extends LinkedWork {
  (): void;
  errorBoundary?: ErrorBoundary;
  cleanup?: Cleanup;
}

export function cleanupEffect(effect: EffectNode): void {
  if (effect.alive) {
    unlinkLinkedWorkDependencies(effect);

    if (effect.cleanup) {
      try {
        effect.cleanup();
      } catch (error) {
        handleError(effect.errorBoundary, error);
      }

      effect.cleanup = undefined;
    }
  }
}

export function flushEffect(effect: EffectNode): void {
  runLinkedWork(effect);
}

export function stopEffect(effect: EffectNode): void {
  if (effect.alive) {
    cleanupEffect(effect);
    destroyLinkedWork(effect);
  }
}

function revalidateEffect(
  effect: EffectNode,
  callback: Effect,
): void {
  const parentTracking = TRACKING;
  const parentErrorBoundary = ERROR_BOUNDARY;
  const parentBatchEffects = BATCH_EFFECTS;
  setTracking(effect);
  setErrorBoundary(effect.errorBoundary);
  setBatchEffects(undefined);
  try {
    batch(() => {
      cleanupEffect(effect);
      effect.cleanup = batchCleanup(callback);
    });
  } catch (error) {
    handleError(effect.errorBoundary, error);
  } finally {
    setBatchEffects(parentBatchEffects);
    setErrorBoundary(parentErrorBoundary);
    setTracking(parentTracking);
  }
}

export function createEffect(effect: Effect): EffectNode {
  const node = Object.assign(
    createLinkedWork(() => {
      revalidateEffect(node, effect);
    }),
    {
      errorBoundary: ERROR_BOUNDARY,
    },
  );
  return node;
}
