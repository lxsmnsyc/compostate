let ID = 0;

export interface LinkedWork {
  work: (target: LinkedWork) => void;
  tag: string;
  id: number;
  alive: boolean;
  dependents?: Set<LinkedWork>;
  dependencies?: Set<LinkedWork>;
}

export function createLinkedWork(tag: string, work: LinkedWork['work']): LinkedWork {
  return {
    work,
    tag,
    id: ID++,
    alive: true,
  };
}

export function addLinkedWorkDependent(target: LinkedWork, dependent: LinkedWork): void {
  if (target.alive) {
    if (!target.dependents) {
      target.dependents = new Set();
    }
    target.dependents.add(dependent);
  }
}

export function removeLinkedWorkDependent(target: LinkedWork, dependent: LinkedWork): void {
  target.dependents?.delete(dependent);
}

export function addLinkedWorkDependency(target: LinkedWork, dependency: LinkedWork): void {
  if (target.alive) {
    if (!target.dependencies) {
      target.dependencies = new Set();
    }
    target.dependencies.add(dependency);
  }
}

export function removeLinkedWorkDependency(target: LinkedWork, dependency: LinkedWork): void {
  target.dependencies?.delete(dependency);
}

function flattenLinkedWork(target: LinkedWork, queue: Set<LinkedWork>): void {
  if (target.alive) {
    queue.delete(target);
    queue.add(target);
    const { dependents } = target;
    if (dependents) {
      new Set(dependents).forEach((dependent) => {
        flattenLinkedWork(dependent, queue);
      });
    }
  }
}

export function runLinkedWorkAlone(target: LinkedWork, queue?: Set<LinkedWork>): void {
  if (target.alive) {
    if (queue) {
      queue.delete(target);
      queue.add(target);
    } else {
      target.work(target);
    }
  }
}

export function runLinkedWork(target: LinkedWork, queue?: Set<LinkedWork>): void {
  if (queue) {
    flattenLinkedWork(target, queue);
  } else if (target.alive) {
    target.work(target);
    const { dependents } = target;
    if (dependents) {
      new Set(dependents).forEach((dependent) => {
        runLinkedWork(dependent);
      });
    }
  }
}

export function unlinkLinkedWorkDependencies(target: LinkedWork): void {
  const { dependencies } = target;
  if (dependencies) {
    new Set(dependencies).forEach((dependency) => {
      removeLinkedWorkDependent(dependency, target);
    });
  }
}

export function destroyLinkedWork(target: LinkedWork): void {
  target.alive = false;
  unlinkLinkedWorkDependencies(target);
}
