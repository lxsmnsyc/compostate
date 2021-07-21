import Context from '../../context';

export const TRACKING = new Context<LinkedWork | undefined>();
export const BATCH_UPDATES = new Context<Set<LinkedWork> | undefined>();

export default class LinkedWork {
  private work?: () => void;

  private alive = true;

  constructor(work?: () => void) {
    this.work = work;
  }

  private dependents?: Set<LinkedWork>;

  addDependent(dependent: LinkedWork): void {
    if (this.alive) {
      if (!this.dependents) {
        this.dependents = new Set();
      }
      this.dependents.add(dependent);
    }
  }

  removeDependent(dependent: LinkedWork): void {
    this.dependents?.delete(dependent);
  }

  private dependencies?: Set<LinkedWork>;

  addDependency(dependency: LinkedWork): void {
    if (this.alive) {
      if (!this.dependencies) {
        this.dependencies = new Set();
      }
      this.dependencies.add(dependency);
    }
  }

  removeDependency(dependency: LinkedWork): void {
    this.dependencies?.delete(dependency);
  }

  run(): void {
    if (this.alive) {
      this.work?.();

      new Set(this.dependents).forEach((dependent) => {
        dependent.run();
      });
    }
  }

  unlinkDependencies(): void {
    this.dependencies?.forEach((dependency) => {
      dependency.removeDependent(this);
    });
  }

  destroy(): void {
    this.alive = false;
    this.dependencies?.clear();
    this.dependents?.clear();
  }
}
