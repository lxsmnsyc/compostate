import Context from '../../context';
import batch from '../batch';
import cleanup from '../cleanup';
import { Effect, EffectOptions } from '../types';
import LinkedWork, { TRACKING } from './linked-work';

export const EFFECT = new Context<EffectNode | undefined>();
export const BATCH_EFFECTS = new Context<EffectNode[] | undefined>();

export default class EffectNode {
  private alive = true;

  private currentCleanup?: ReturnType<Effect>;

  private effect: Effect;

  private parent?: EffectNode;

  private revalidateWork?: LinkedWork;

  private options?: Partial<EffectOptions>;

  constructor(effect: Effect, options?: Partial<EffectOptions>) {
    this.effect = effect;
    this.options = options;
  }

  forwardError(error: Error): void {
    if (this.parent) {
      this.parent.handleError(error);
    } else {
      throw error;
    }
  }

  handleError(error: Error): void {
    if (this.options?.onError) {
      try {
        this.options.onError(error);
      } catch (newError) {
        this.forwardError(error);
        this.forwardError(newError);
      }
    } else {
      this.forwardError(error);
    }
  }

  cleanup(): void {
    if (this.alive) {
      this.revalidateWork?.unlinkDependencies();

      if (this.currentCleanup) {
        try {
          this.currentCleanup();
        } catch (error) {
          this.handleError(error);
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
      const currentEffect = EFFECT.current();
      if (currentEffect) {
        this.parent = currentEffect;
      }
    }
  }

  revalidate(): void {
    if (this.alive) {
      this.cleanup();
      TRACKING.push(this.revalidateWork);
      EFFECT.push(this);
      BATCH_EFFECTS.push(undefined);
      try {
        batch(() => {
          this.currentCleanup = cleanup(() => {
            this.effect();
          });
        });
      } catch (error) {
        this.handleError(error);
      } finally {
        BATCH_EFFECTS.pop();
        EFFECT.pop();
        TRACKING.pop();
      }
    }
  }
}
