import { describe, expect, it, vi } from 'vitest';
import {
  atom,
  deferred,
  flushIdle,
  pulse,
  signal,
  syncEffect,
} from '../../src';

describe('signal', () => {
  it('splits an atom into a reader and a writer', () => {
    const [count, setCount] = signal(1);
    expect(count()).toBe(1);
    setCount(2);
    expect(count()).toBe(2);
  });

  it('accepts a functional update', () => {
    const [count, setCount] = signal(1);
    setCount(prev => prev + 1);
    expect(count()).toBe(2);
  });

  it('notifies trackers of the reader', () => {
    const [count, setCount] = signal(1);
    const seen: number[] = [];
    syncEffect(() => {
      seen.push(count());
    });
    setCount(2);
    expect(seen).toEqual([1, 2]);
  });
});

describe('pulse', () => {
  it('notifies trackers without carrying a value', () => {
    const [track, update] = pulse();
    const callback = vi.fn(track);
    syncEffect(callback);
    update();
    update();
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it('only notifies the computations that tracked it', () => {
    const [track, update] = pulse();
    const tracked = vi.fn(track);
    const untracked = vi.fn();
    syncEffect(tracked);
    syncEffect(untracked);
    update();
    expect(tracked).toHaveBeenCalledTimes(2);
    expect(untracked).toHaveBeenCalledTimes(1);
  });
});

describe('deferred', () => {
  it('computes eagerly on first read', () => {
    const value = atom(1);
    const derived = deferred(() => value() * 2);
    expect(derived()).toBe(2);
  });

  it('holds the previous value until the queue is flushed', () => {
    const value = atom(1);
    const derived = deferred(() => value() * 2);
    expect(derived()).toBe(2);
    value(2);
    expect(derived()).toBe(2);
    flushIdle();
    expect(derived()).toBe(4);
  });
});
