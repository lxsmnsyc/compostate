import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { atom, batch, flushIdle, syncEffect, untrack } from '../../src';
import { Harness } from './harness';
import { scenarioArbitrary } from './spec';

describe('model: random graphs against an oracle', () => {
  it('matches the oracle after every command', () => {
    fc.assert(
      fc.property(scenarioArbitrary, ({ graph, commands }) => {
        const harness = new Harness(graph);
        for (const command of commands) {
          harness.step(command);
        }
        harness.finish();
      }),
      { numRuns: 200 },
    );
  });
});

describe('properties', () => {
  const values = fc.array(fc.integer({ min: 0, max: 3 }), { maxLength: 20 });

  it('untracked reads never re-run an effect but are read fresh', () => {
    fc.assert(
      fc.property(values, writes => {
        const tracked = atom(0);
        const hidden = atom(0);
        const seen: [number, number][] = [];
        syncEffect(() => {
          seen.push([tracked(), untrack(hidden)]);
        });

        // Alternate the two atoms and mirror what the effect should see.
        const expected: [number, number][] = [[0, 0]];
        let trackedValue = 0;
        let hiddenValue = 0;
        for (const [index, value] of writes.entries()) {
          if (index % 2 === 0) {
            hidden(value);
            hiddenValue = value;
          } else {
            tracked(value);
            if (value !== trackedValue) {
              trackedValue = value;
              expected.push([trackedValue, hiddenValue]);
            }
          }
        }
        expect(seen).toEqual(expected);
      }),
      { numRuns: 100 },
    );
  });

  it('a batch runs the effect at most once, on the final values', () => {
    fc.assert(
      fc.property(values, writes => {
        const first = atom(0);
        const second = atom(0);
        const batched: number[] = [];
        syncEffect(() => {
          batched.push(first() * 10 + second());
        });
        const lastBatched = () => batched[batched.length - 1];

        batch(() => {
          for (const [index, value] of writes.entries()) {
            (index % 2 === 0 ? first : second)(value);
          }
        });
        flushIdle();

        expect(batched.length).toBeLessThanOrEqual(2);
        let finalFirst = 0;
        let finalSecond = 0;
        for (const [index, value] of writes.entries()) {
          if (index % 2 === 0) {
            finalFirst = value;
          } else {
            finalSecond = value;
          }
        }
        expect(lastBatched()).toBe(finalFirst * 10 + finalSecond);
      }),
      { numRuns: 100 },
    );
  });
});
