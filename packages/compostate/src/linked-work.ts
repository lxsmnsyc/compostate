let ID = 0;

export interface LinkedWork {
  (): void;
  tag: string;
  id: number;
  alive: boolean;
  dependents?: LinkedWork[];
  dependentsPosition?: Record<string, number | undefined>;
  dependencies?: LinkedWork[];
  dependenciesPosition?: Record<string, number | undefined>;
}

const objAssign = Object.assign;

export function createLinkedWork(tag: string, work?: () => void): LinkedWork {
  return objAssign(work ?? (() => { /* no-op */ }), {
    tag,
    id: ID++,
    alive: true,
  });
}

export function addLinkedWorkDependent(target: LinkedWork, dependent: LinkedWork): void {
  if (target.alive) {
    if (!target.dependents || !target.dependentsPosition) {
      target.dependents = [];
      target.dependentsPosition = {};
    }
    if (!target.dependentsPosition[dependent.id]) {
      const index = target.dependents.length;
      target.dependentsPosition[dependent.id] = index;
      target.dependents[index] = dependent;
    }
  }
}

export function removeLinkedWorkDependent(target: LinkedWork, dependent: LinkedWork): void {
  if (!target.dependents || !target.dependentsPosition) {
    return;
  }
  const node = target.dependentsPosition[dependent.id];
  if (node) {
    const last = target.dependents.pop();
    if (last) {
      target.dependents[node] = last;
    }
    target.dependentsPosition[dependent.id] = undefined;
  }
}

export function addLinkedWorkDependency(target: LinkedWork, dependency: LinkedWork): void {
  if (target.alive) {
    if (!target.dependencies || !target.dependenciesPosition) {
      target.dependencies = [];
      target.dependenciesPosition = {};
    }
    if (!target.dependenciesPosition[dependency.id]) {
      const index = target.dependencies.length;
      target.dependenciesPosition[dependency.id] = index;
      target.dependencies[index] = dependency;
    }
  }
}

export function removeLinkedWorkDependency(target: LinkedWork, dependency: LinkedWork): void {
  if (!target.dependencies || !target.dependenciesPosition) {
    return;
  }
  const node = target.dependenciesPosition[dependency.id];
  if (node) {
    const last = target.dependencies.pop();
    if (last) {
      target.dependencies[node] = last;
    }
    target.dependenciesPosition[dependency.id] = undefined;
  }
}

function flattenLinkedWork(target: LinkedWork, queue: Set<LinkedWork>): void {
  if (target.alive) {
    queue.delete(target);
    queue.add(target);
    const { dependents } = target;
    if (dependents) {
      const copy = Array.from(dependents);
      for (let i = 0, len = copy.length; i < len; i += 1) {
        flattenLinkedWork(copy[i], queue);
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
      target();
    }
  }
}

export function runLinkedWork(target: LinkedWork, queue?: Set<LinkedWork>): void {
  if (queue) {
    flattenLinkedWork(target, queue);
  } else if (target.alive) {
    target();

    const { dependents } = target;
    if (dependents) {
      const copy = Array.from(dependents);
      for (let i = 0, len = copy.length; i < len; i += 1) {
        runLinkedWork(copy[i]);
      }
    }
  }
}

export function unlinkLinkedWorkDependencies(target: LinkedWork): void {
  const { dependencies } = target;
  if (dependencies) {
    for (let i = 0, len = dependencies.length; i < len; i += 1) {
      removeLinkedWorkDependent(dependencies[i], target);
    }
  }
}

export function destroyLinkedWork(target: LinkedWork): void {
  target.alive = false;
  unlinkLinkedWorkDependencies(target);
  delete target.dependencies;
  delete target.dependents;
  delete target.dependenciesPosition;
  delete target.dependentsPosition;
}
