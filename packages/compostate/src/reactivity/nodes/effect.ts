import batch from '../batch';
import batchCleanup from '../batch-cleanup';
import { Effect } from '../types';
import ErrorBoundary, { ERROR_BOUNDARY, handleError, setErrorBoundary } from './error-boundary';
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

export default class EffectNode {
  private alive = true;

  private currentCleanup?: ReturnType<Effect>;

  private effect: Effect;

  private errorBoundary?: ErrorBoundary;

  private revalidateWork?: LinkedWork;

  constructor(effect: Effect, errorBoundary?: ErrorBoundary) {
    this.effect = effect;
    this.errorBoundary = errorBoundary;
  }

  cleanup(): void {
    if (this.alive) {
      if (this.revalidateWork) {
        unlinkLinkedWorkDependencies(this.revalidateWork);
      }

      if (this.currentCleanup) {
        try {
          this.currentCleanup();
        } catch (error) {
          handleError(this.errorBoundary, error);
        }

        this.currentCleanup = undefined;
      }
    }
  }

  stop(): void {
    if (this.alive) {
      this.cleanup();
      if (this.revalidateWork) {
        destroyLinkedWork(this.revalidateWork);
      }
      this.alive = false;
    }
  }

  flush(): void {
    if (this.alive) {
      if (!this.revalidateWork) {
        this.revalidateWork = createLinkedWork(() => {
          this.revalidate();
        });
      }
      runLinkedWork(this.revalidateWork);
    }
  }

  revalidate(): void {
    if (this.alive) {
      const parentTracking = TRACKING;
      const parentErrorBoundary = ERROR_BOUNDARY;
      const parentBatchEffects = BATCH_EFFECTS;
      setTracking(this.revalidateWork);
      setErrorBoundary(this.errorBoundary);
      setBatchEffects(undefined);
      try {
        batch(() => {
          this.cleanup();
          this.currentCleanup = batchCleanup(() => this.effect());
        });
      } catch (error) {
        handleError(this.errorBoundary, error);
      } finally {
        setBatchEffects(parentBatchEffects);
        setErrorBoundary(parentErrorBoundary);
        setTracking(parentTracking);
      }
    }
  }
}
