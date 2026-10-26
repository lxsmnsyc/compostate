import { describe, expect, it } from 'vitest';
import { atom, computed, onCleanup, syncEffect } from '../../src';

describe('dependency graph', () => {
  it('recomputes when a direct dependency changes but an intermediate computed does not', () => {
    const value = atom(0);
    const parity = computed(() => value() % 2);
    const derived = computed(() => value() + parity());
    expect(derived()).toBe(0);
    value(2);
    expect(derived()).toBe(2);
  });

  it('runs an effect once per write in a diamond', () => {
    const value = atom(1);
    const left = computed(() => value() + 1);
    const right = computed(() => value() * 2);
    let runs = 0;
    syncEffect(() => {
      runs++;
      left();
      right();
    });
    runs = 0;
    value(2);
    expect(runs).toBe(1);
  });

  it('handles deep chains read by an effect', () => {
    const source = atom(0);
    let previous: () => number = source;
    for (let i = 0; i < 1000; i++) {
      const read = previous;
      previous = computed(() => read() + 1);
    }
    const last = previous;
    let seen = 0;
    syncEffect(() => {
      seen = last();
    });
    source(1);
    expect(seen).toBe(1001);
  });

  it('drops dependencies that are no longer read', () => {
    const flag = atom(true);
    const a = atom(1);
    const b = atom(2);
    let runs = 0;
    const derived = computed(() => {
      runs++;
      return flag() ? a() : b();
    });
    syncEffect(() => {
      derived();
    });
    flag(false);
    runs = 0;
    a(10);
    expect(runs).toBe(0);
    b(20);
    expect(runs).toBe(1);
    expect(derived()).toBe(20);
  });

  it('keeps a dependency that moved earlier in the read order', () => {
    const flag = atom(true);
    const a = atom(1);
    const b = atom(2);
    let seen = 0;
    syncEffect(() => {
      // The first run reads [flag, b, a], the second run reads [flag, a].
      seen = flag() ? b() + a() : a();
    });
    flag(false);
    a(5);
    expect(seen).toBe(5);
    b(7);
    expect(seen).toBe(5);
  });

  it('reruns an effect that writes to a dependency it already read', () => {
    const value = atom(0);
    const doubled = computed(() => value() * 2);
    const seen: number[] = [];
    syncEffect(() => {
      seen.push(doubled());
      if (value() < 2) {
        value(value() + 1);
      }
    });
    expect(seen).toEqual([0, 2, 4]);
  });

  it('reruns an effect that writes to an atom it read for the first time', () => {
    const value = atom(0);
    const seen: number[] = [];
    syncEffect(() => {
      seen.push(value());
      if (value() < 2) {
        value(value() + 1);
      }
    });
    expect(seen).toEqual([0, 1, 2]);
  });

  it('cleans up every run of an effect that reruns itself', () => {
    const value = atom(0);
    let active = 0;
    syncEffect(() => {
      active++;
      onCleanup(() => {
        active--;
      });
      if (value() < 2) {
        value(value() + 1);
      }
    });
    expect(active).toBe(1);
  });
});
