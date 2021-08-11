let ID = 0;

export interface LinkedWork {
  tag: string;
  id: number;
  alive: boolean;
  dependents?: Set<LinkedWork>;
  dependencies?: Set<LinkedWork>;
}

const RUNNER: Record<string, (work: LinkedWork) => void> = {};

export function setRunner(tag: string, work: (work: LinkedWork) => void): void {
  RUNNER[tag] = work;
}

export function createLinkedWork(tag: string): LinkedWork {
  return {
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
    if (dependents?.size) {
      const copy = new Set(dependents);
      for (const dependent of copy) {
        flattenLinkedWork(dependent, queue);
      }
    }
  }
}

export function runLinkedWorkAlone(target: LinkedWork, queue?: Set<LinkedWork>): void {
  if (target.alive) {
    if (queue) {
      queue.delete(target);
      queue.add(target);
    } else {
      RUNNER[target.tag](target);
    }
  }
}

function evaluateLinkedWork(target: LinkedWork): void {
  if (target.alive) {
    RUNNER[target.tag](target);
    const { dependents } = target;
    if (dependents?.size) {
      const copy = new Set(dependents);
      for (const dependent of copy) {
        evaluateLinkedWork(dependent);
      }
    }
  }
}

export function runLinkedWork(target: LinkedWork, queue?: Set<LinkedWork>): void {
  if (queue) {
    flattenLinkedWork(target, queue);
  } else {
    evaluateLinkedWork(target);
  }
}

export function unlinkLinkedWorkDependencies(target: LinkedWork): void {
  const { dependencies } = target;
  if (dependencies?.size) {
    const copy = new Set(dependencies);
    for (const dependency of copy) {
      removeLinkedWorkDependent(dependency, target);
    }
  }
}

export function destroyLinkedWork(target: LinkedWork): void {
  target.alive = false;
  unlinkLinkedWorkDependencies(target);
}
