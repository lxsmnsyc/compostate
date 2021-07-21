import Context from '../../context';
import { Effect, EffectOptions } from '../types';
import LinkedWork, { TRACKING } from './linked-work';

export const EFFECT = new Context<EffectNode | undefined>();
export const BATCH_EFFECTS = new Context<Set<EffectNode> | undefined>();

export default class EffectNode {
  private alive = true;

  private currentCleanup?: ReturnType<Effect>;

  private effect: Effect;

  private parent?: EffectNode;

  private children?: Set<EffectNode>;

  private revalidateWork?: LinkedWork;

  private options?: Partial<EffectOptions>;

  constructor(effect: Effect, options?: Partial<EffectOptions>) {
    this.effect = effect;
    this.options = options;
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
          if (this.parent?.options?.onError) {
            this.parent.options.onError(error);
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
        this.parent = currentEffect;
      }
    }
  }

  revalidate(): void {
    if (this.alive) {
      this.cleanup();
      const popTracking = TRACKING.push(this.revalidateWork);
      const popEffect = EFFECT.push(this);
      const popBatchEffects = BATCH_EFFECTS.push(undefined);
      try {
        this.currentCleanup = this.effect();
      } catch (error) {
        if (this.parent?.options?.onError) {
          this.parent.options.onError(error);
        } else {
          throw error;
        }
      } finally {
        popBatchEffects();
        popEffect();
        popTracking();
      }
    }
  }
}
