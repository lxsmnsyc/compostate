import { expect } from 'vitest';
import {
  atom,
  batch,
  batchCleanup,
  computed,
  effect,
  flushIdle,
  onCleanup,
  syncEffect,
} from '../../src';
import { Oracle } from './oracle';
import type { Command, GraphSpec, Observation, ReadSpec } from './spec';
import { evaluate } from './spec';

type CycleEvent = 'run' | 'cleanup';

interface LiveNode {
  spec: ReadSpec;
  runs: number;
  events: CycleEvent[];
  // Ids read by the last run, in read order.
  reads: number[];
}

interface LiveEffect extends LiveNode {
  disposed: boolean;
  dispose: () => void;
  // What the last run read, with the values it saw.
  seen: Observation[];
  // Runs whose reads differed from the oracle at the moment of the run.
  glitches: string[];
}

interface Snapshot {
  values: number[];
  computedRuns: number[];
  computedReads: number[][];
  effectRuns: number[];
  effectReads: number[][];
  effectDisposed: boolean[];
}

/**
 * Runs a graph on the real library next to an oracle and checks both after
 * every command.
 */
export class Harness {
  oracle: Oracle;
  getters: (() => number)[] = [];
  setters: ((value: number) => number)[] = [];
  computeds: LiveNode[] = [];
  effects: LiveEffect[] = [];
  disposeAll: () => void;

  constructor(private graph: GraphSpec) {
    this.oracle = new Oracle(graph);
    this.disposeAll = batchCleanup(() => this.build());

    // Idle effects run their first time on this flush.
    flushIdle();
    this.checkState();
  }

  private build(): void {
    // Atoms take the first ids.
    for (const initial of this.graph.atoms) {
      const instance = atom(initial);
      this.getters.push(() => instance());
      this.setters.push(value => instance(value));
    }

    // Computeds follow, and each one reads only the ids before it.
    for (const spec of this.graph.computeds) {
      const live: LiveNode = { spec, runs: 0, events: [], reads: [] };
      this.computeds.push(live);
      this.getters.push(
        computed(() => {
          startRun(live);
          const reads: number[] = [];
          const result = evaluate(spec, id => {
            reads.push(id);
            return this.getters[id]();
          });
          live.reads = reads;
          return result;
        }),
      );
    }

    // Effects are leaves, so nothing reads them.
    for (const { read, idle } of this.graph.effects) {
      const live: LiveEffect = {
        spec: read,
        runs: 0,
        events: [],
        reads: [],
        disposed: false,
        dispose: NO_OP,
        seen: [],
        glitches: [],
      };
      this.effects.push(live);
      const callback = (): void => this.runEffect(live);
      live.dispose = idle ? effect(callback) : syncEffect(callback);
    }
  }

  private runEffect(live: LiveEffect): void {
    startRun(live);

    // Read the nodes the way the real effect sees them.
    const seen: Observation[] = [];
    evaluate(live.spec, id => {
      const value = this.getters[id]();
      seen.push([id, value]);
      return value;
    });
    live.seen = seen;
    live.reads = [];
    for (const [id] of seen) {
      live.reads.push(id);
    }

    // The oracle's atom values are current at this moment, so any other
    // observation is a glitch: a mix of old and new values.
    const expected = this.oracle.observe(live.spec);
    if (JSON.stringify(seen) !== JSON.stringify(expected)) {
      live.glitches.push(
        `saw ${JSON.stringify(seen)}, oracle has ${JSON.stringify(expected)}`,
      );
    }
  }

  private snapshot(): Snapshot {
    const snapshot: Snapshot = {
      values: this.oracle.values(),
      computedRuns: [],
      computedReads: [],
      effectRuns: [],
      effectReads: [],
      effectDisposed: [],
    };
    for (const node of this.computeds) {
      snapshot.computedRuns.push(node.runs);
      snapshot.computedReads.push([...node.reads]);
    }
    for (const node of this.effects) {
      snapshot.effectRuns.push(node.runs);
      snapshot.effectReads.push([...node.reads]);
      snapshot.effectDisposed.push(node.disposed);
    }
    return snapshot;
  }

  // Writes go through here so the oracle always has the current atom values.
  // Returns the atom id when the write changed its value.
  private write(atomIndex: number, value: number): number | undefined {
    const id = atomIndex % this.graph.atoms.length;
    const changed = this.oracle.atoms[id] !== value;
    this.oracle.atoms[id] = value;
    this.setters[id](value);
    return changed ? id : undefined;
  }

  step(command: Command): void {
    const before = this.snapshot();
    // Atoms that really changed value, at the moment of their write.
    const changedAtoms = new Set<number>();
    let writeCount = 0;

    // Run the command against the real graph.
    switch (command.type) {
      case 'write': {
        writeCount = 1;
        const id = this.write(command.atom, command.value);
        if (id !== undefined) {
          changedAtoms.add(id);
        }
        break;
      }
      case 'batch': {
        writeCount = command.writes.length;
        batch(() => {
          for (const item of command.writes) {
            const id = this.write(item.atom, item.value);
            if (id !== undefined) {
              changedAtoms.add(id);
            }
          }
        });
        break;
      }
      case 'read': {
        const id = command.node % this.getters.length;
        expect(this.getters[id]()).toBe(this.oracle.values()[id]);
        break;
      }
      case 'dispose': {
        const target = this.effects[command.effect % this.effects.length];
        target.disposed = true;
        // A second dispose must stay harmless, so the first command can
        // repeat on the same effect.
        target.dispose();
        break;
      }
    }

    // Idle effects only run when the queue is drained.
    flushIdle();

    // Reading every computed lets the lazy ones run, so the counts below
    // cover a full command.
    this.checkState();
    this.checkRunCounts(before, changedAtoms, writeCount);
  }

  /** Disposes the whole graph and checks that every cleanup ran. */
  finish(): void {
    const runs: number[] = [];
    for (const node of this.effects) {
      runs.push(node.runs);
    }
    this.disposeAll();
    flushIdle();

    for (const [index, node] of this.effects.entries()) {
      expect(node.runs).toBe(runs[index]);
      checkEvents(node, true);
    }
    for (const node of this.computeds) {
      checkEvents(node, true);
    }
  }

  // Values and observations after a command match the oracle.
  private checkState(): void {
    // Every node equals the oracle.
    const values = this.oracle.values();
    for (const [id, value] of values.entries()) {
      expect(this.getters[id]()).toBe(value);
    }

    // Live effects last saw exactly what the oracle sees now, and none ever
    // saw a mix of old and new values.
    for (const node of this.effects) {
      expect(node.glitches).toEqual([]);
      if (!node.disposed) {
        expect(node.seen).toEqual(this.oracle.observe(node.spec));
      }
      checkEvents(node, node.disposed);
    }
    for (const node of this.computeds) {
      checkEvents(node, false);
    }
  }

  private checkRunCounts(
    before: Snapshot,
    changedAtoms: Set<number>,
    writeCount: number,
  ): void {
    const after = this.oracle.values();
    const atomCount = this.graph.atoms.length;

    // Atoms reachable from the reads of the last run, found with the reads
    // from before the command.
    const reachesChange = (reads: number[]): boolean => {
      const stack = [...reads];
      const visited = new Set<number>();
      while (stack.length > 0) {
        const id = stack.pop()!;
        if (visited.has(id)) {
          continue;
        }
        visited.add(id);
        if (id < atomCount) {
          if (changedAtoms.has(id)) {
            return true;
          }
        } else {
          stack.push(...before.computedReads[id - atomCount]);
        }
      }
      return false;
    };

    const checkNode = (name: string, reads: number[], delta: number): void => {
      let valueChanged = false;
      for (const id of reads) {
        if (before.values[id] !== after[id]) {
          valueChanged = true;
          break;
        }
      }

      // A change is picked up at most once, however many writes made it.
      expect(delta, `${name} ran ${delta} times`).toBeLessThanOrEqual(1);
      // A changed input value must reach the node.
      if (valueChanged) {
        expect(delta, `${name} missed a change`).toBe(1);
      }
      // Without a changed atom behind its reads, a node cannot run.
      if (!reachesChange(reads)) {
        expect(delta, `${name} ran without a changed input`).toBe(0);
      }
      // A single write bumps each atom once and unchanged computed values
      // are not propagated, so equal input values mean no run.
      if (writeCount <= 1 && !valueChanged) {
        expect(delta, `${name} ran for equal inputs`).toBe(0);
      }
    };

    for (const [index, node] of this.computeds.entries()) {
      const delta = node.runs - before.computedRuns[index];
      checkNode(
        `computed ${atomCount + index}`,
        before.computedReads[index],
        delta,
      );
    }
    for (const [index, node] of this.effects.entries()) {
      const delta = node.runs - before.effectRuns[index];
      if (before.effectDisposed[index]) {
        // A disposed effect never runs again.
        expect(delta, `disposed effect ${index} ran`).toBe(0);
      } else if (node.disposed) {
        expect(delta, `effect ${index} ran while disposing`).toBe(0);
      } else {
        checkNode(`effect ${index}`, before.effectReads[index], delta);
      }
    }
  }
}

function NO_OP(): void {
  // Replaced once the effect exists.
}

// Called first in every run of a computed or an effect.
function startRun(node: LiveNode): void {
  node.runs++;
  node.events.push('run');
  onCleanup(() => {
    node.events.push('cleanup');
  });
}

// Runs and cleanups alternate: a cleanup before each re-run and one on
// dispose, so a live node ends on a run and a disposed node on a cleanup.
function checkEvents(node: LiveNode, disposed: boolean): void {
  for (const [index, event] of node.events.entries()) {
    expect(event).toBe(index % 2 === 0 ? 'run' : 'cleanup');
  }
  expect(Math.ceil(node.events.length / 2)).toBe(node.runs);
  if (node.events.length > 0) {
    const last = node.events[node.events.length - 1];
    expect(last).toBe(disposed ? 'cleanup' : 'run');
  }
}
