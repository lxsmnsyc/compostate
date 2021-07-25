import LinkedWork, { TRACKING } from './linked-work';
import ReactiveAtom from './reactive-atom';
import { registerTrackable } from './track-map';

interface Value<T> {
  value: T;
}

export default class ComputedNode<T> {
  private val: Value<T> | undefined;

  private atom = new ReactiveAtom();

  constructor(compute: () => T) {
    const work = new LinkedWork(() => {
      work.unlinkDependencies();
      const popTracking = TRACKING.push(work);
      try {
        this.val = {
          value: compute(),
        };
      } finally {
        popTracking();
      }
      this.atom.notify();
    });

    work.run();

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
