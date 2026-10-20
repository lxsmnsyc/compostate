import { describe, expect, it, vi } from 'vitest';
import { atom, computed, syncEffect, untrack } from '../../src';

describe('computed', () => {
  it('derives from the atoms it reads', () => {
    const value = atom(1);
    const doubled = computed(() => value() * 2);
    expect(doubled()).toBe(2);
    value(2);
    expect(doubled()).toBe(4);
  });

  it('is lazy until it is first read', () => {
    const compute = vi.fn(() => 1);
    const derived = computed(compute);
    expect(compute).not.toHaveBeenCalled();
    derived();
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it('memoizes between reads', () => {
    const value = atom(1);
    const compute = vi.fn(() => value() * 2);
    const derived = computed(compute);
    derived();
    derived();
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it('receives the previous value', () => {
    const value = atom(1);
    const seen: (number | undefined)[] = [];
    const derived = computed<number>(prev => {
      seen.push(prev?.value);
      return value();
    });
    derived();
    value(2);
    derived();
    expect(seen).toEqual([undefined, 1]);
  });

  it('does not notify trackers when the result is unchanged', () => {
    const value = atom(1);
    const derived = computed(() => value() > 0);
    const callback = vi.fn(() => {
      derived();
    });
    syncEffect(callback);
    value(2);
    expect(callback).toHaveBeenCalledTimes(1);
    value(-1);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('honors a custom equality function', () => {
    const value = atom(1);
    const derived = computed(() => ({ id: value() }), {
      isEqual: (a, b) => a.id === b.id,
    });
    const callback = vi.fn(() => {
      derived();
    });
    syncEffect(callback);
    value(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('memoizes thrown errors', () => {
    const compute = vi.fn(() => {
      throw new Error('failed');
    });
    const derived = computed(compute);
    expect(derived).toThrow('failed');
    expect(derived).toThrow('failed');
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it('composes with other computed values', () => {
    const value = atom(2);
    const doubled = computed(() => value() * 2);
    const quadrupled = computed(() => doubled() * 2);
    expect(quadrupled()).toBe(8);
    value(3);
    expect(quadrupled()).toBe(12);
  });

  it('does not track reads made inside untrack', () => {
    const value = atom(1);
    const compute = vi.fn(() => untrack(value));
    const derived = computed(compute);
    derived();
    value(2);
    expect(derived()).toBe(1);
    expect(compute).toHaveBeenCalledTimes(1);
  });
});
