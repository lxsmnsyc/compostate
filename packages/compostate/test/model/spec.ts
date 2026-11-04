import * as fc from 'fast-check';

/**
 * Describes how one computed or effect reads the nodes before it. Atoms take
 * the ids `0..atoms.length - 1` and computeds follow, so a spec only reads
 * ids that already exist.
 */
export interface ReadSpec {
  /** When true, the value of `selector` picks `left` or `right` to read. */
  branching: boolean;
  modulus: number;
  selector: number;
  left: number[];
  right: number[];
}

export interface EffectSpec {
  read: ReadSpec;
  idle: boolean;
}

export interface GraphSpec {
  atoms: number[];
  computeds: ReadSpec[];
  effects: EffectSpec[];
}

export type Command =
  | { type: 'write'; atom: number; value: number }
  | { type: 'batch'; writes: { atom: number; value: number }[] }
  | { type: 'read'; node: number }
  | { type: 'dispose'; effect: number };

export interface Scenario {
  graph: GraphSpec;
  commands: Command[];
}

export type Observation = [id: number, value: number];

/**
 * Evaluates a spec through `read`. The oracle and the real graph both use it,
 * so the two agree on which nodes a spec reads for a given set of values.
 */
export function evaluate(spec: ReadSpec, read: (id: number) => number): number {
  let total = 0;
  let branch = spec.left;

  // The selector is always read first, and its parity picks the branch.
  if (spec.branching) {
    const selected = read(spec.selector);
    total += selected;
    if (selected % 2 === 1) {
      branch = spec.right;
    }
  }

  // The chosen branch is read in order, so a repeated id is read twice.
  for (const id of branch) {
    total += read(id);
  }

  return total % spec.modulus;
}

interface RawReadSpec {
  branching: boolean;
  modulus: number;
  selector: number;
  left: number[];
  right: number[];
}

function resolveIds(raw: number[], available: number): number[] {
  const ids: number[] = [];
  for (const value of raw) {
    ids.push(value % available);
  }
  return ids;
}

function resolveReadSpec(raw: RawReadSpec, available: number): ReadSpec {
  return {
    branching: raw.branching,
    modulus: raw.modulus,
    selector: raw.selector % available,
    left: resolveIds(raw.left, available),
    right: resolveIds(raw.right, available),
  };
}

const rawReadSpec = fc.record({
  branching: fc.boolean(),
  // Small moduli make many recomputations produce the same value, which
  // exercises the equality check.
  modulus: fc.integer({ min: 2, max: 5 }),
  selector: fc.nat(),
  left: fc.array(fc.nat(), { maxLength: 3 }),
  right: fc.array(fc.nat(), { maxLength: 3 }),
});

const atomValue = fc.integer({ min: 0, max: 4 });

export const graphArbitrary: fc.Arbitrary<GraphSpec> = fc
  .record({
    atoms: fc.array(atomValue, { minLength: 1, maxLength: 5 }),
    computeds: fc.array(rawReadSpec, { maxLength: 8 }),
    effects: fc.array(fc.record({ read: rawReadSpec, idle: fc.boolean() }), {
      minLength: 1,
      maxLength: 4,
    }),
  })
  .map(({ atoms, computeds, effects }) => {
    // Computed `i` can read the atoms and the `i` computeds before it.
    const resolvedComputeds: ReadSpec[] = [];
    for (const [index, raw] of computeds.entries()) {
      resolvedComputeds.push(resolveReadSpec(raw, atoms.length + index));
    }

    // Effects can read every atom and every computed.
    const available = atoms.length + computeds.length;
    const resolvedEffects: EffectSpec[] = [];
    for (const effect of effects) {
      resolvedEffects.push({
        read: resolveReadSpec(effect.read, available),
        idle: effect.idle,
      });
    }

    return { atoms, computeds: resolvedComputeds, effects: resolvedEffects };
  });

const writeArbitrary = fc.record({ atom: fc.nat(), value: atomValue });

const commandArbitrary: fc.Arbitrary<Command> = fc.oneof(
  {
    weight: 4,
    arbitrary: writeArbitrary.map(w => ({ type: 'write' as const, ...w })),
  },
  {
    weight: 3,
    arbitrary: fc
      .array(writeArbitrary, { minLength: 1, maxLength: 4 })
      .map(writes => ({ type: 'batch' as const, writes })),
  },
  {
    weight: 2,
    arbitrary: fc.nat().map(node => ({ type: 'read' as const, node })),
  },
  {
    weight: 1,
    arbitrary: fc.nat().map(effect => ({ type: 'dispose' as const, effect })),
  },
);

export const scenarioArbitrary: fc.Arbitrary<Scenario> = fc.record({
  graph: graphArbitrary,
  commands: fc.array(commandArbitrary, { maxLength: 25 }),
});
