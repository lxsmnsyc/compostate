import { describe, expect, it, vi } from 'vitest';
import type { Atom } from '../../src';
import { atom, batchCleanup, syncEffect, untrack } from '../../src';

describe('atom', () => {
  it('reads back the value it was created with', () => {
    const value = atom(1);
    expect(value()).toBe(1);
  });

  it('returns the written value', () => {
    const value = atom(1);
    expect(value(2)).toBe(2);
    expect(value()).toBe(2);
  });

  it('notifies trackers when the value changes', () => {
    const value = atom(1);
    const seen: number[] = [];
    syncEffect(() => {
      seen.push(value());
    });
    value(2);
    value(3);
    expect(seen).toEqual([1, 2, 3]);
  });

  it('ignores writes that are equal to the current value', () => {
    const value = atom(1);
    const callback = vi.fn(() => {
      value();
    });
    syncEffect(callback);
    value(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('treats NaN as equal to itself', () => {
    const value = atom(Number.NaN);
    const callback = vi.fn(() => {
      value();
    });
    syncEffect(callback);
    value(Number.NaN);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('honors a custom equality function', () => {
    const value = atom({ id: 1 }, { isEqual: (a, b) => a.id === b.id });
    const callback = vi.fn(() => {
      value();
    });
    syncEffect(callback);
    value({ id: 1 });
    expect(callback).toHaveBeenCalledTimes(1);
    value({ id: 2 });
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('does not track reads made inside untrack', () => {
    const value = atom(1);
    const callback = vi.fn(() => {
      untrack(value);
    });
    syncEffect(callback);
    value(2);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('stops notifying once its owning boundary is disposed', () => {
    let value: Atom<number>;
    const dispose = batchCleanup(() => {
      value = atom(1);
    });
    const callback = vi.fn(() => {
      value();
    });
    syncEffect(callback);
    dispose();
    value!(2);
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
