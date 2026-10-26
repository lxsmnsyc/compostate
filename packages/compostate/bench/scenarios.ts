import {
  atom,
  batch,
  batchCleanup,
  computed,
  signal,
  syncEffect,
} from '../src';

export interface Scenario {
  name: string;
  // Builds the graph and returns the work to measure plus a disposer.
  setup(): { run: () => void; dispose: () => void };
}

function scoped(build: () => () => void): {
  run: () => void;
  dispose: () => void;
} {
  let run!: () => void;
  const dispose = batchCleanup(() => {
    run = build();
  });
  return { run, dispose };
}

export const scenarios: Scenario[] = [
  {
    name: 'create 1k atoms + computeds + effects',
    setup() {
      let disposers: (() => void)[] = [];
      return {
        run() {
          for (const d of disposers) d();
          disposers = [];
          for (let i = 0; i < 1000; i++) {
            disposers.push(
              batchCleanup(() => {
                const a = atom(i);
                const c = computed(() => a() * 2);
                syncEffect(() => {
                  c();
                });
              }),
            );
          }
        },
        dispose() {
          for (const d of disposers) d();
        },
      };
    },
  },
  {
    name: 'deep chain (1 atom, 40 computeds, 1 effect)',
    setup() {
      return scoped(() => {
        const source = atom(0);
        let prev: () => number = source;
        for (let i = 0; i < 40; i++) {
          const p = prev;
          prev = computed(() => p() + 1);
        }
        const last = prev;
        syncEffect(() => {
          last();
        });
        let i = 0;
        return () => {
          source(++i);
        };
      });
    },
  },
  {
    name: 'wide fan-out (1 atom, 1k computeds + effects)',
    setup() {
      return scoped(() => {
        const source = atom(0);
        for (let i = 0; i < 1000; i++) {
          const c = computed(() => source() + i);
          syncEffect(() => {
            c();
          });
        }
        let i = 0;
        return () => {
          batch(() => {
            source(++i);
          });
        };
      });
    },
  },
  {
    name: 'diamond grid (4 wide, 10 layers)',
    setup() {
      return scoped(() => {
        const sources = [atom(1), atom(2), atom(3), atom(4)];
        let layer: (() => number)[] = sources;
        for (let d = 0; d < 10; d++) {
          const m = layer;
          layer = [
            computed(() => m[1]()),
            computed(() => m[0]() - m[2]()),
            computed(() => m[1]() + m[3]()),
            computed(() => m[2]()),
          ];
        }
        const end = layer;
        syncEffect(() => {
          for (const e of end) e();
        });
        let i = 0;
        return () => {
          batch(() => {
            i++;
            sources[0](i);
            sources[1](i * 2);
            sources[2](i * 3);
            sources[3](i * 4);
          });
        };
      });
    },
  },
  {
    name: 'many sources, one sum effect (1k atoms)',
    setup() {
      return scoped(() => {
        const sources = Array.from({ length: 1000 }, (_, i) => atom(i));
        const sum = computed(() => {
          let s = 0;
          for (const a of sources) s += a();
          return s;
        });
        syncEffect(() => {
          sum();
        });
        let i = 0;
        return () => {
          sources[i++ % 1000](i);
        };
      });
    },
  },
  {
    name: 'dynamic deps toggle',
    setup() {
      return scoped(() => {
        const [flag, setFlag] = signal(true);
        const a = Array.from({ length: 20 }, (_, i) => atom(i));
        const b = Array.from({ length: 20 }, (_, i) => atom(i));
        const c = computed(() => {
          let s = 0;
          for (const x of flag() ? a : b) s += x();
          return s;
        });
        syncEffect(() => {
          c();
        });
        return () => {
          setFlag(v => !v);
        };
      });
    },
  },
  {
    name: 'cached computed reads (no changes)',
    setup() {
      return scoped(() => {
        const source = atom(1);
        const c = computed(() => source() * 2);
        return () => {
          for (let i = 0; i < 1000; i++) c();
        };
      });
    },
  },
  {
    name: 'equal writes skip (computed isEqual stops propagation)',
    setup() {
      return scoped(() => {
        const source = atom(0);
        const parity = computed(() => source() % 2);
        for (let i = 0; i < 100; i++) {
          const c = computed(() => parity() + i);
          syncEffect(() => {
            c();
          });
        }
        let i = 0;
        return () => {
          source((i += 2));
        };
      });
    },
  },
];
