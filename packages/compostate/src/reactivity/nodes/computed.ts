import LinkedWork, { TRACKING } from './linked-work';

interface Value<T> {
  value: T;
}

export default class ComputedNode<T> {
  private val: Value<T> | undefined;

  private compute: () => T;

  private work?: LinkedWork;

  constructor(compute: () => T) {
    this.compute = compute;
  }

  get value(): T {
    const tracking = TRACKING.getContext();
    if (tracking) {
      if (!this.work) {
        this.work = new LinkedWork(() => {
          this.work?.unlinkDependencies();
          const popTracking = TRACKING.push(this.work);
          try {
            this.val = {
              value: this.compute(),
            };
          } finally {
            popTracking();
          }
        });

        this.work.run();
      }
      this.work.addDependent(tracking);
      tracking.addDependency(this.work);
    }
    if (this.val) {
      return this.val.value;
    }
    throw new Error('failed computed');
  }
}
