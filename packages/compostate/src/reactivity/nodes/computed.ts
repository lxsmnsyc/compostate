import LinkedWork, { TRACKING } from './linked-work';

interface Value<T> {
  value: T;
}

export default class ComputedNode<T> {
  private val: Value<T> | undefined;

  private work: LinkedWork;

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
    });

    work.run();

    this.work = work;
  }

  get value(): T {
    const tracking = TRACKING.getContext();
    if (tracking) {
      this.work.addDependent(tracking);
      tracking.addDependency(this.work);
    }
    if (this.val) {
      return this.val.value;
    }
    throw new Error('failed computed');
  }
}
