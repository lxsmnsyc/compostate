import { describe, expect, it, vi } from 'vitest';
import {
  atom,
  batch,
  batchCleanup,
  computed,
  effect,
  flushIdle,
  onCleanup,
  syncEffect,
  unbatch,
} from '../../src';

describe('syncEffect', () => {
  it('runs immediately', () => {
    const callback = vi.fn();
    syncEffect(callback);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('re-runs when a tracked atom changes', () => {
    const value = atom(1);
    const callback = vi.fn(() => {
      value();
    });
    syncEffect(callback);
    value(2);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('stops re-running once disposed', () => {
    const value = atom(1);
    const callback = vi.fn(() => {
      value();
    });
    const dispose = syncEffect(callback);
    dispose();
    value(2);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('runs the cleanups it registered before each re-run', () => {
    const value = atom(1);
    const cleanup = vi.fn();
    syncEffect(() => {
      value();
      onCleanup(cleanup);
    });
    expect(cleanup).toHaveBeenCalledTimes(0);
    value(2);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('runs the last cleanup on dispose', () => {
    const cleanup = vi.fn();
    const dispose = syncEffect(() => {
      onCleanup(cleanup);
    });
    dispose();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('tracks a dependency added on a later run', () => {
    const toggle = atom(false);
    const value = atom(1);
    const callback = vi.fn(() => {
      if (toggle()) {
        value();
      }
    });
    syncEffect(callback);
    value(2);
    expect(callback).toHaveBeenCalledTimes(1);
    toggle(true);
    expect(callback).toHaveBeenCalledTimes(2);
    value(3);
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it('drops a dependency that is no longer read', () => {
    const toggle = atom(true);
    const value = atom(1);
    const callback = vi.fn(() => {
      if (toggle()) {
        value();
      }
    });
    syncEffect(callback);
    toggle(false);
    expect(callback).toHaveBeenCalledTimes(2);
    value(2);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('runs once for a batch of writes', () => {
    const first = atom(1);
    const second = atom(1);
    const callback = vi.fn(() => {
      first();
      second();
    });
    syncEffect(callback);
    batch(() => {
      first(2);
      second(2);
    });
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('runs per write when the batch is opted out of', () => {
    const first = atom(1);
    const second = atom(1);
    const callback = vi.fn(() => {
      first();
      second();
    });
    syncEffect(callback);
    batch(() => {
      unbatch(() => {
        first(2);
        second(2);
      });
    });
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it('sees a computed value settle before the effect runs', () => {
    const value = atom(1);
    const doubled = computed(() => value() * 2);
    const seen: number[] = [];
    syncEffect(() => {
      seen.push(doubled());
    });
    value(2);
    expect(seen).toEqual([2, 4]);
  });
});

describe('effect', () => {
  it('defers its first run until the queue is flushed', () => {
    const callback = vi.fn();
    effect(callback);
    expect(callback).not.toHaveBeenCalled();
    flushIdle();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('defers its re-runs as well', () => {
    const value = atom(1);
    const callback = vi.fn(() => {
      value();
    });
    effect(callback);
    flushIdle();
    value(2);
    expect(callback).toHaveBeenCalledTimes(1);
    flushIdle();
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('collapses several writes into a single deferred run', () => {
    const value = atom(1);
    const callback = vi.fn(() => {
      value();
    });
    effect(callback);
    flushIdle();
    value(2);
    value(3);
    flushIdle();
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('never runs when it is disposed before the flush', () => {
    const callback = vi.fn();
    const dispose = batchCleanup(() => {
      effect(callback);
    });
    dispose();
    flushIdle();
    expect(callback).not.toHaveBeenCalled();
  });
});
