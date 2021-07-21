import Context from '../../context';
import { Effect } from '../types';
import ErrorBoundary, { ERROR } from './error-boundary';
import LinkedWork, { TRACKING } from './linked-work';

export const EFFECT = new Context<EffectNode | undefined>();
export const BATCH_EFFECTS = new Context<Set<EffectNode> | undefined>();

export default class EffectNode {
  private alive = true;

  private currentCleanup?: ReturnType<Effect>;

  private effect: Effect;

  private parentError?: ErrorBoundary;

  private children?: Set<EffectNode>;

  private revalidateWork?: LinkedWork;

  private errorBoundary: ErrorBoundary;

  constructor(effect: Effect) {
    this.effect = effect;
    this.parentError = ERROR.getContext();
    this.errorBoundary = new ErrorBoundary(this.parentError);
  }

  cleanup(): void {
    if (this.alive) {
      this.revalidateWork?.unlinkDependencies();

      new Set(this.children).forEach((child) => {
        child.stop();
      });

      this.children?.clear();

      if (this.currentCleanup) {
        try {
          this.currentCleanup();
        } catch (error) {
          if (this.parentError) {
            this.parentError.capture(error);
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
      const currentEffect = EFFECT.getContext();
      if (currentEffect) {
        if (!currentEffect.children) {
          currentEffect.children = new Set();
        }
        currentEffect.children.add(this);
      }
    }
  }

  revalidate(): void {
    if (this.alive) {
      this.cleanup();
      const popTracking = TRACKING.push(this.revalidateWork);
      const popEffect = EFFECT.push(this);
      const popError = ERROR.push(this.errorBoundary);
      const popBatchEffects = BATCH_EFFECTS.push(undefined);
      try {
        this.currentCleanup = this.effect();
      } catch (error) {
        if (this.parentError) {
          this.parentError.capture(error);
        } else {
          throw error;
        }
      } finally {
        popBatchEffects();
        popError();
        popEffect();
        popTracking();
      }
    }
  }
}
