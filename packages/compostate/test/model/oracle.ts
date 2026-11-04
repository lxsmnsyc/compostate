import type { GraphSpec, Observation, ReadSpec } from './spec';
import { evaluate } from './spec';

/**
 * A plain evaluator. It keeps the atom values and recomputes every node from
 * scratch on each call, with no caching and no tracking.
 */
export class Oracle {
  atoms: number[];

  constructor(private graph: GraphSpec) {
    this.atoms = [...graph.atoms];
  }

  /** The value of every node, atoms first and then computeds, in id order. */
  values(): number[] {
    const values = [...this.atoms];
    for (const spec of this.graph.computeds) {
      values.push(evaluate(spec, id => values[id]));
    }
    return values;
  }

  /** The reads an effect or computed would make now, in order. */
  observe(spec: ReadSpec): Observation[] {
    const values = this.values();
    const seen: Observation[] = [];
    evaluate(spec, id => {
      seen.push([id, values[id]]);
      return values[id];
    });
    return seen;
  }
}
