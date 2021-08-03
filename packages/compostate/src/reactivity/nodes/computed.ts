import CleanupNode from './cleanup';
import ErrorBoundary, { ERROR_BOUNDARY } from './error-boundary';
import LinkedWork, { TRACKING } from './linked-work';
import ReactiveAtom from './reactive-atom';
import { registerTrackable } from './track-map';

interface Value<T> {
  value: T;
}

export default class ComputedNode<T> {
  private val: Value<T> | undefined;

  private atom = new ReactiveAtom();

  constructor(compute: () => T, errorBoundary?: ErrorBoundary, cleanupNode?: CleanupNode) {
    const work = new LinkedWork(() => {
      work.unlinkDependencies();
      TRACKING.push(work);
      ERROR_BOUNDARY.push(errorBoundary);
      try {
        this.val = {
          value: compute(),
        };
      } catch (error) {
        if (errorBoundary) {
          errorBoundary.handleError(error);
        } else {
          throw error;
        }
      } finally {
        ERROR_BOUNDARY.pop();
        TRACKING.pop();
      }
      this.atom.notify();
    });

    work.run();

    cleanupNode?.register(() => {
      work.destroy();
    });

    registerTrackable(this.atom, this);
  }

  get value(): T {
    this.atom.track();
    if (this.val) {
      return this.val.value;
    }
    throw new Error('failed computed');
  }
}
