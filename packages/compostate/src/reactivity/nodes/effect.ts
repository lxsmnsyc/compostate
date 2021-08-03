import Context from '../../context';
import batch from '../batch';
import batchCleanup from '../batch-cleanup';
import { Effect } from '../types';
import ErrorBoundary, { ERROR_BOUNDARY } from './error-boundary';
import LinkedWork, { TRACKING } from './linked-work';

export const BATCH_EFFECTS = new Context<EffectNode[] | undefined>();

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
      this.revalidateWork?.unlinkDependencies();

      if (this.currentCleanup) {
        try {
          this.currentCleanup();
        } catch (error) {
          if (this.errorBoundary) {
            this.errorBoundary.handleError(error);
          } else {
            throw error;
          }
        }

        this.currentCleanup = undefined;
      }
    }
  }

  stop(): void {
    if (this.alive) {
      this.cleanup();
      this.revalidateWork?.destroy();
      this.alive = false;
    }
  }

  flush(): void {
    if (this.alive) {
      if (!this.revalidateWork) {
        this.revalidateWork = new LinkedWork(this.revalidate.bind(this));
      }
      this.revalidateWork.run();
    }
  }

  revalidate(): void {
    if (this.alive) {
      this.cleanup();
      TRACKING.push(this.revalidateWork);
      ERROR_BOUNDARY.push(this.errorBoundary);
      BATCH_EFFECTS.push(undefined);
      try {
        batch(() => {
          this.currentCleanup = batchCleanup(() => this.effect());
        });
      } catch (error) {
        if (this.errorBoundary) {
          this.errorBoundary.handleError(error);
        } else {
          throw error;
        }
      } finally {
        BATCH_EFFECTS.pop();
        ERROR_BOUNDARY.pop();
        TRACKING.pop();
      }
    }
  }
}
