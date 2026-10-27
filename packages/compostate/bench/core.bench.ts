import { afterAll, bench, describe } from 'vitest';
import { scenarios } from './scenarios';

describe('core', () => {
  for (const scenario of scenarios) {
    const { run, dispose } = scenario.setup();
    afterAll(dispose);
    bench(scenario.name, run);
  }
});
